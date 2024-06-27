import { Client, Databases, ID } from 'node-appwrite';
import { DM_TYPES, detail_jzg, gen_token, list_jzg, rs_dm } from './api.js';

export default async ({ req, res, log, error }: { req: REQ_TYPE; res: RES_TYPE; log: LOG_TYPE; error: ERROR_TYPE }) => {
  // setKey is optional if you deploy the function and run it in the Appwrite instance.
  // setKey is only available in node-appwrite package
  // For local development, you need use node-appwrite package and setKey to configure the client
  // For deployment, you need to remove setKey
  // If you get some error like AppwriteException: Document with the requested ID could not be found when you run the function in the Appwrite instance,
  // you need configure Permissions of the collection in the Appwrite dashboard
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite.app.ynu.edu.cn/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '6673ddf4ec7a1b2192f7');

  log(`You are running in ${process.env.NODE_ENV === 'development' ? 'development' : 'production'} mode!`);

  if (process.env.NODE_ENV === 'development') {
    client.setKey(process.env.APPWRITE_API_KEY!);
  }

  try {
    // const databases = new Databases(client);
    // const document = await databases.getDocument(
    //   process.env.APPWRITE_DATABASE_ID || 'sync_staff_to_wecom_docs',
    //   process.env.APPWRITE_COLLECTION_ID || 'dep_to_sheet',
    //   '667b800a0011ada862f7'
    // );
    // log(document);

    // 获取后续API调用所需的token
    const authorization = await gen_token({ key: process.env.YNU_API_KEY! });

    // 获取 信息技术中心 的组织结构代码
    const yxdms = await rs_dm(DM_TYPES.YXDM, {}, { authorization });
    const dep = yxdms.find((dm) => dm.MC === '信息技朊中心')?.DM || '3004';

    // 获取 信息技术中心 的职工列表
    const jzgs = await list_jzg({ dep }, { authorization });
    const zgh = jzgs.map((jzg) => jzg.ZGH);

    // 获取 信息技术中心 的职工详细信息
    const jzg_details = await detail_jzg({ zgh }, { authorization });

    // 获取 名族, 政治面貌, 当前状态, 用人方式, 学历, 专业技术职务级别 代码
    const mzdm = await rs_dm(DM_TYPES.MZDM, {}, { authorization });
    const zzmm = await rs_dm(DM_TYPES.ZZMMDM, {}, { authorization });
    const dqztdm = await rs_dm(DM_TYPES.DQZTDM, {}, { authorization });
    const yrfsdm = await rs_dm(DM_TYPES.YRFSDM, {}, { authorization });
    const xl = await rs_dm(DM_TYPES.XLDM, {}, { authorization });
    const zyjszwjb = await rs_dm(DM_TYPES.GBZWJB, {}, { authorization });

    const find_mc = (
      dm: string | null,
      dm_data: DM_GENERAL_DATA[],
      find_function: (item: DM_GENERAL_DATA) => boolean
    ) => {
      if (!dm || !dm_data) return '';
      const result = dm_data.find(find_function);
      return result ? result.MC : '';
    };
    // 填充职工详细信息
    for (const jzg of jzg_details) {
      jzg.MZMC = find_mc(jzg.MZDM, mzdm, (dm) => dm.DM === jzg.MZDM);
      jzg.ZZMMMC = find_mc(jzg.ZZMMDM, zzmm, (dm) => dm.DM === jzg.ZZMMDM);
      jzg.DQZTMC = find_mc(jzg.DQZTDM, dqztdm, (dm) => dm.DM === jzg.DQZTDM);
      jzg.YRFSMC = find_mc(jzg.YRFSDM, yrfsdm, (dm) => dm.DM === jzg.YRFSDM);
      jzg.XLMC = find_mc(jzg.ZGXLDM, xl, (dm) => dm.DM === jzg.ZGXLDM);
      jzg.ZYJSZWJBMC = find_mc(jzg.ZYJSZWJBDM, zyjszwjb, (dm) => dm.DM === jzg.ZYJSZWJBDM);
    }
    log(`jzg_details: ${JSON.stringify(jzg_details, null, 2)}`);

    return res.json({ success: true, data: jzg_details });
  } catch (error) {
    console.error(error);
  }
};
