import { Client, Databases, ID, Query } from 'node-appwrite';
import { DM_TYPES, detail_jzg, gen_token, list_jzg, rs_dm } from './api.js';
import { template, remove_null_undefined_values } from './utilities.js';
import { Doc, SmartSheet } from 'wecom-wedoc';
import { FieldType } from 'wecom-wedoc/dist/smart-sheet-field.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.align(),
    winston.format.timestamp({ format: 'YYYY-MM-DD T hh:mm:ss.sss A' }),
    winston.format.printf(({ level, message, timestamp, label }) => {
      return `${level.toUpperCase()} | ${timestamp} | ${message}`;
    })
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

logger.info(`You are running in ${process.env.NODE_ENV === 'development' ? 'development' : 'production'} mode!`);

const {
  APPWRITE_ENDPOINT,
  APPWRITE_FUNCTION_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID,
  CORP_ID,
  SECRET,
  DOC_NAME,
  SPACEID,
  FATHERID,
  ADMIN_USERS,
  SHEET_NAME,
  REMOVE_IRRELEVANT_RECORDS,
} = process.env;
const required_envs = {
  APPWRITE_ENDPOINT,
  APPWRITE_FUNCTION_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID,
  CORP_ID,
  SECRET,
};
// check required environment variables
if (Object.values(required_envs).some((v) => !v)) {
  const missing_envs = Object.entries(required_envs)
    .filter(([k, v]) => !v)
    .map(([k, _]) => k);
  logger.error(`Some of required variables ${missing_envs.join(',')} are not provided`);
  throw new Error(`Some of required variables ${missing_envs.join(',')} are not provided`);
}

const appwrite_endpoint = APPWRITE_ENDPOINT;
const appwrite_function_project_id = APPWRITE_FUNCTION_PROJECT_ID;
const appwrite_api_key = APPWRITE_API_KEY;
const appwrite_database_id = APPWRITE_DATABASE_ID;
const appwrite_collection_id = APPWRITE_COLLECTION_ID;
const options = {
  corpId: CORP_ID,
  secret: SECRET,
};
const doc_name = DOC_NAME || '教职工信息表-${dep_name}';
const spaceid = SPACEID || null;
const fatherid = FATHERID || null;
// admin_users 创建文档时所需的文档管理员userid
const admin_users = ADMIN_USERS?.split(',');
const sheet_name = SHEET_NAME || '教职工信息表-${dep_name}';
const remove_irrelevant_records = REMOVE_IRRELEVANT_RECORDS === 'true' || true;

async function get_jzg(dep_ids: string[], { log }: { log: LOG_TYPE }) {
  // 获取后续API调用所需的token
  const authorization = await gen_token({ key: process.env.YNU_API_KEY! });
  // 获取 指定部门 的组织结构代码
  const yxdms = await rs_dm(DM_TYPES.YXDM, {}, { authorization });
  // dep 为 id 和 name 的映射
  const dep: { dep_id: string; dep_name: string }[] = [];
  for (const dep_id of dep_ids) {
    const dep_name = yxdms.find((dm) => dm.DM === dep_id)?.MC;
    if (!dep_name) {
      throw new Error(`dep for dep_id ${dep_id} not found`);
    }
    dep.push({ dep_id, dep_name });
  }
  // 通过代码获取名称
  const find_mc = (
    dm: string | null,
    dm_data: DM_GENERAL_DATA[],
    find_function: (item: DM_GENERAL_DATA) => boolean
  ) => {
    if (!dm || !dm_data) return '';
    const result = dm_data.find(find_function);
    return result ? result.MC : '';
  };
  // jzg_data 为部门id和职工详细信息的映射
  const jzg_data: { [key: string]: JZG_DETAIL[] } = {};
  for (const dep_id of dep.map((d) => d.dep_id)) {
    // 获取 指定部门 的职工列表
    const jzgs = await list_jzg({ dep: dep_id }, { authorization });
    const zgh = jzgs.map((jzg) => jzg.ZGH);
    // 获取 指定部门 的职工详细信息
    const jzg_details = await detail_jzg({ zgh }, { authorization });
    // 获取 名族, 政治面貌, 当前状态, 用人方式, 学历, 专业技术职务级别 代码
    const mzdm = await rs_dm(DM_TYPES.MZDM, {}, { authorization });
    const zzmm = await rs_dm(DM_TYPES.ZZMMDM, {}, { authorization });
    const dqztdm = await rs_dm(DM_TYPES.DQZTDM, {}, { authorization });
    const yrfsdm = await rs_dm(DM_TYPES.YRFSDM, {}, { authorization });
    const xl = await rs_dm(DM_TYPES.XLDM, {}, { authorization });
    const zyjszwjb = await rs_dm(DM_TYPES.GBZWJB, {}, { authorization });
    // 填充职工详细信息
    for (const jzg of jzg_details) {
      jzg.MZMC = find_mc(jzg.MZDM, mzdm, (dm) => dm.DM === jzg.MZDM);
      jzg.ZZMMMC = find_mc(jzg.ZZMMDM, zzmm, (dm) => dm.DM === jzg.ZZMMDM);
      jzg.DQZTMC = find_mc(jzg.DQZTDM, dqztdm, (dm) => dm.DM === jzg.DQZTDM);
      jzg.YRFSMC = find_mc(jzg.YRFSDM, yrfsdm, (dm) => dm.DM === jzg.YRFSDM);
      jzg.XLMC = find_mc(jzg.ZGXLDM, xl, (dm) => dm.DM === jzg.ZGXLDM);
      jzg.ZYJSZWJBMC = find_mc(jzg.ZYJSZWJBDM, zyjszwjb, (dm) => dm.DM === jzg.ZYJSZWJBDM);
    }
    jzg_data[dep_id] = jzg_details;
  }
  return { dep, jzg_data };
}

async function fill_jzg_to_sheet(
  doc_ids: string[],
  sheet_ids: string[],
  data: { dep: { dep_id: string; dep_name: string }[]; jzg_data: { [key: string]: JZG_DETAIL[] } }
) {
  const { dep, jzg_data } = data;
  const dep_ids = dep.map((d) => d.dep_id);
  const dep_names = dep.map((d) => d.dep_name);
  const statistics: { dep_id: string; dep_name: string; add: number; update: number; delete: number }[] = [];
  for (let i = 0; i < dep_names.length; i++) {
    const dep_id = dep_ids[i];
    const dep_name = dep_names[i];
    let docid = doc_ids[i];
    let sheet_id = sheet_ids[i];
    // 如果没有传递 DOC_IDS 则创建一个名为 教职工信息表-部门名称 的文档
    if (!dep_id) {
      let res = await Doc.create(
        // @ts-ignore:next-line TODO: need to fix the type definition of remove_null_undefined_values
        remove_null_undefined_values({
          spaceid,
          fatherid,
          doc_type: 10, //文档类型, 3:文档 4:表格 10:智能表格（目前仅支持自建应用创建）
          doc_name: template(doc_name, { dep_id, dep_name }), //文档名称
          admin_users,
        }),
        options
      );
      doc_ids[i] = res.docid;
      docid = res.docid;
      logger.info(`Doc for ${dep_name} not passed, created with response, ${JSON.stringify(res)}`);
    }
    // 如果没有传递 SHEET_ID 则根据部门列表创建一系列名为部门名称的 sheet
    if (!sheet_id) {
      let res = await SmartSheet.Sheet.add(
        { docid, properties: { title: template(sheet_name, { dep_id, dep_name, doc_id: docid }) } },
        options
      );
      sheet_ids[i] = res.sheet_id;
      sheet_id = res.sheet_id;
      logger.info(`Sheet for ${dep_name} not passed, created with response, ${JSON.stringify(res)}`);
    }
    // 统计添加、更新、删除的数据
    const statistic = { dep_id, dep_name, add: 0, update: 0, delete: 0 };
    // 根据是否有唯一的智能表列字段，判断是否需要添加字段，如果需要添加字段，则直接添加数据，否则更新数据
    let res = await SmartSheet.Field.fields({ docid, sheet_id }, options);
    if (res.length == 1 && res[0].field_title == '智能表列') {
      // 待删除的字段，只能创建其他字段之后删除
      const post_remove_unused_fields = res.map((field: any) => field.field_id);
      // 根据 JZG_DETAIL 添加相应的fields，注意字段的顺序是逆序的
      const fields: { field_title: string; field_type: FieldType }[] = [
        {
          field_title: '组织机构代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '民族代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '姓名',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '政治面貌代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '当前状态代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '职工号',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '用人方式代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '最高学历代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '专业技术职务级别代码',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '民族名称',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '政治面貌名称',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '当前状态名称',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '用人方式名称',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '最高学历名称',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
        {
          field_title: '专业技术职务级别名称',
          field_type: FieldType.FIELD_TYPE_TEXT,
        },
      ].reverse();
      res = await SmartSheet.Field.add(
        {
          docid,
          sheet_id,
          fields,
        },
        options
      );
      // 删除多余的字段
      if (post_remove_unused_fields) {
        res = await SmartSheet.Field.del({ docid, sheet_id, field_ids: post_remove_unused_fields }, options);
        logger.info(`Sheet for ${dep_name} remove unused fields with response ${JSON.stringify(res)}`);
      }
      // 清空可能已有的数据
      res = await SmartSheet.Record.records({ docid, sheet_id }, options);
      logger.info(`Sheet for ${dep_name} has existed ${res.length} records with response ${JSON.stringify(res)}`);
      const record_ids = res.map((record: any) => record.record_id);
      res = await SmartSheet.Record.del({ docid, sheet_id, record_ids }, options);
      logger.info(`Sheet for ${dep_name} remove existed records with response ${JSON.stringify(res)}`);
      // 根据 JZG_DETAIL 添加相应的records
      const records = jzg_data[dep_id].map((jzg) => {
        return {
          values: {
            组织机构代码: [{ type: 'text', text: jzg.YXDM }],
            民族代码: [{ type: 'text', text: jzg.MZDM }],
            姓名: [{ type: 'text', text: jzg.XM }],
            政治面貌代码: [{ type: 'text', text: jzg.ZZMMDM }],
            当前状态代码: [{ type: 'text', text: jzg.DQZTDM }],
            职工号: [{ type: 'text', text: jzg.ZGH }],
            用人方式代码: [{ type: 'text', text: jzg.YRFSDM }],
            最高学历代码: [{ type: 'text', text: jzg.ZGXLDM }],
            专业技术职务级别代码: [{ type: 'text', text: jzg.ZYJSZWJBDM }],
            民族名称: [{ type: 'text', text: jzg.MZMC }],
            政治面貌名称: [{ type: 'text', text: jzg.ZZMMMC }],
            当前状态名称: [{ type: 'text', text: jzg.DQZTMC }],
            用人方式名称: [{ type: 'text', text: jzg.YRFSMC }],
            最高学历名称: [{ type: 'text', text: jzg.XLMC }],
            专业技术职务级别名称: [{ type: 'text', text: jzg.ZYJSZWJBMC }],
          },
        };
      });
      statistic.add = records.length;
      // @ts-ignore:next-line TODO: need to fix the type definition of records
      res = await SmartSheet.Record.add({ docid, sheet_id, records }, options);
      // @ts-ignore:next-line TODO: need to fix the type definition of records
      logger.info(`Sheet for ${dep_name} add ${res.records?.length} records with response ${JSON.stringify(res)}`);
    } else {
      // 查找已有的数据，并且让 record_id 和 jzg.ZGH 对应进行更新，更新操作也会涉及到添加或删除
      res = await SmartSheet.Record.records({ docid, sheet_id }, options);
      logger.info(`Sheet for ${dep_name} has existed ${res.length} records with response ${JSON.stringify(res)}`);
      const zgh_record_id_mappings = Object.fromEntries(
        res.map((record: any) => [record.values['职工号'][0].text, record.record_id])
      );
      const record_id_zgh_mappings = Object.fromEntries(
        Object.entries(zgh_record_id_mappings).map(([zgh, record_id]) => [record_id, zgh])
      );
      // 根据 JZG_DETAIL 更新相应的records
      const add_jzgs = jzg_data[dep_id].filter((jzg) => !zgh_record_id_mappings[jzg.ZGH]);
      const update_jzgs = jzg_data[dep_id].filter((jzg) => zgh_record_id_mappings[jzg.ZGH]);
      const jghs = jzg_data[dep_id].map((jzg) => jzg.ZGH);
      const delete_record_ids = Object.keys(record_id_zgh_mappings).filter(
        (record_id) => !jghs.includes(record_id_zgh_mappings[record_id])
      );
      logger.verbose(
        `Sheet for ${dep_name} prepare add: ${add_jzgs.length} ${JSON.stringify(add_jzgs)}, update: ${update_jzgs.length} ${JSON.stringify(update_jzgs)}, delete: ${delete_record_ids.length} ${JSON.stringify(delete_record_ids)}`
      );
      // 添加新的记录
      let records = add_jzgs.map((jzg) => {
        return {
          record_id: zgh_record_id_mappings[jzg.ZGH],
          values: {
            组织机构代码: [{ type: 'text', text: jzg.YXDM }],
            民族代码: [{ type: 'text', text: jzg.MZDM }],
            姓名: [{ type: 'text', text: jzg.XM }],
            政治面貌代码: [{ type: 'text', text: jzg.ZZMMDM }],
            当前状态代码: [{ type: 'text', text: jzg.DQZTDM }],
            职工号: [{ type: 'text', text: jzg.ZGH }],
            用人方式代码: [{ type: 'text', text: jzg.YRFSDM }],
            最高学历代码: [{ type: 'text', text: jzg.ZGXLDM }],
            专业技术职务级别代码: [{ type: 'text', text: jzg.ZYJSZWJBDM }],
            民族名称: [{ type: 'text', text: jzg.MZMC }],
            政治面貌名称: [{ type: 'text', text: jzg.ZZMMMC }],
            当前状态名称: [{ type: 'text', text: jzg.DQZTMC }],
            用人方式名称: [{ type: 'text', text: jzg.YRFSMC }],
            最高学历名称: [{ type: 'text', text: jzg.XLMC }],
            专业技术职务级别名称: [{ type: 'text', text: jzg.ZYJSZWJBMC }],
          },
        };
      });
      statistic.add = records.length;
      // @ts-ignore:next-line TODO: need to fix the type definition of records
      res = await SmartSheet.Record.add({ docid, sheet_id, records }, options);
      // @ts-ignore:next-line TODO: need to fix the type definition of records
      logger.info(`Sheet for ${dep_name} add ${res.records?.length} records with response ${JSON.stringify(res)}`);
      // 更新已有的记录
      records = update_jzgs.map((jzg) => {
        return {
          record_id: zgh_record_id_mappings[jzg.ZGH],
          values: {
            组织机构代码: [{ type: 'text', text: jzg.YXDM }],
            民族代码: [{ type: 'text', text: jzg.MZDM }],
            姓名: [{ type: 'text', text: jzg.XM }],
            政治面貌代码: [{ type: 'text', text: jzg.ZZMMDM }],
            当前状态代码: [{ type: 'text', text: jzg.DQZTDM }],
            职工号: [{ type: 'text', text: jzg.ZGH }],
            用人方式代码: [{ type: 'text', text: jzg.YRFSDM }],
            最高学历代码: [{ type: 'text', text: jzg.ZGXLDM }],
            专业技术职务级别代码: [{ type: 'text', text: jzg.ZYJSZWJBDM }],
            民族名称: [{ type: 'text', text: jzg.MZMC }],
            政治面貌名称: [{ type: 'text', text: jzg.ZZMMMC }],
            当前状态名称: [{ type: 'text', text: jzg.DQZTMC }],
            用人方式名称: [{ type: 'text', text: jzg.YRFSMC }],
            最高学历名称: [{ type: 'text', text: jzg.XLMC }],
            专业技术职务级别名称: [{ type: 'text', text: jzg.ZYJSZWJBMC }],
          },
        };
      });
      // @ts-ignore:next-line TODO: need to fix the type definition of SmartSheet.Record.update
      res = await SmartSheet.Record.update({ docid, sheet_id, records }, options);
      statistic.update = records.length;
      // @ts-ignore:next-line TODO: need to fix the type definition of SmartSheet.Record.update
      logger.info(`Sheet for ${dep_name} update ${res.records?.length} records with response ${JSON.stringify(res)}`);
      // 删除多余的记录
      if (remove_irrelevant_records) {
        res = await SmartSheet.Record.del({ docid, sheet_id, record_ids: delete_record_ids }, options);
        logger.info(
          `Sheet for ${dep_name} delete ${delete_record_ids.length} records with response ${JSON.stringify(res)}`
        );
        statistic.delete = delete_record_ids.length;
      }
    }
    statistics.push(statistic);
  }
  return { dep, doc_ids, sheet_ids, statistics };
}

async function save_docid_and_sheet_id(
  client: Client,
  dep: { dep_id: string; dep_name: string }[],
  doc_ids: string[],
  sheet_ids: string[]
) {
  const dep_ids = dep.map((d) => d.dep_id);
  const dep_names = dep.map((d) => d.dep_name);
  for (let i = 0; i < dep_ids.length; i++) {
    const dep_id = dep_ids[i];
    const dep_name = dep_names[i];
    const docid = doc_ids[i];
    const sheet_id = sheet_ids[i];
    const databases = new Databases(client);
    const document = await databases.listDocuments(
      appwrite_database_id || 'sync_staff_to_wecom_docs',
      appwrite_collection_id || 'dep_to_sheet',
      [Query.equal('dep_id', [dep_id])]
    );
    // check if the document exists
    if (document.documents.length > 0) {
      const doc = document.documents[0];
      await databases.updateDocument(
        appwrite_database_id || 'sync_staff_to_wecom_docs',
        appwrite_collection_id || 'dep_to_sheet',
        doc.$id,
        { docid, sheet_id, dep_name }
      );
      logger.info(`updateDocument`, doc.$id, { docid, sheet_id });
    } else {
      await databases.createDocument(
        appwrite_database_id || 'sync_staff_to_wecom_docs',
        appwrite_collection_id || 'dep_to_sheet',
        ID.unique(),
        { dep_id, docid, sheet_id, dep_name }
      );
    }
    logger.info(`createDocument`, { dep_id, docid, sheet_id });
  }
}

async function get_config(client: Client) {
  const databases = new Databases(client);
  const { total, documents } = await databases.listDocuments(
    appwrite_database_id || 'sync_staff_to_wecom_docs',
    appwrite_collection_id || 'dep_to_sheet'
  );
  logger.info(`Found ${total} documents in the collection`);
  if (total === 0) {
    return [];
  }
  return documents.map((doc) => ({
    dep_id: doc.dep_id,
    docid: doc.docid,
    sheet_id: doc.sheet_id,
    dep_name: doc.dep_name,
  }));
}

export default async ({ req, res, log, error }: { req: REQ_TYPE; res: RES_TYPE; log: LOG_TYPE; error: ERROR_TYPE }) => {
  // setKey is optional if you deploy the function and run it in the Appwrite instance.
  // setKey is only available in node-appwrite package
  // For local development, you need use node-appwrite package and setKey to configure the client
  // For deployment, you need to remove setKey
  // If you get some error like AppwriteException: Document with the requested ID could not be found when you run the function in the Appwrite instance,
  // you need configure Permissions of the collection in the Appwrite dashboard
  const client = new Client()
    .setEndpoint(appwrite_endpoint || 'http://appwrite.app.ynu.edu.cn/v1')
    .setProject(appwrite_function_project_id || '6673ddf4ec7a1b2192f7');

  if (process.env.NODE_ENV === 'development') {
    if (!appwrite_api_key) {
      logger.error('APPWRITE_API_KEY is required in development mode');
      throw new Error('APPWRITE_API_KEY is required in development mode');
    }
    client.setKey(appwrite_api_key!);
  }

  try {
    // 从数据库中获取 dep_id, docid, sheet_id 信息
    const dep_doc_sheet_info = await get_config(client);
    // 如果数据库内没有相关信息，则直接返回
    if (!dep_doc_sheet_info.length) {
      return res.json({ success: false, message: 'No config records found, processed nothing' });
    }

    const dep_ids = [];
    const doc_ids_raw = [];
    const sheet_ids_raw = [];
    for (const info of dep_doc_sheet_info) {
      dep_ids.push(info.dep_id);
      doc_ids_raw.push(info.docid);
      sheet_ids_raw.push(info.sheet_id);
    }

    // 获取教职工信息
    const { dep, jzg_data } = await get_jzg(dep_ids, { log });

    // 填充到智能表格，并返回准确的 doc_ids 和 sheet_ids
    const { doc_ids, sheet_ids, statistics } = await fill_jzg_to_sheet(doc_ids_raw, sheet_ids_raw, { dep, jzg_data });

    // 保存/更新dep_id, docid, sheet_id到数据库
    save_docid_and_sheet_id(client, dep, doc_ids, sheet_ids);

    return res.json({ success: true, statistics });
  } catch (error) {
    console.error(error);
  }
};
