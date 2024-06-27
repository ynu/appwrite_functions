import { is_null_or_undefined_or_empty_object } from './utilities.js';

const { YNU_API_HOST } = process.env;

/**
 * 代码信息
 */
export const DM_TYPES = {
  /**
   * 组织结构代码
   */
  YXDM: 'yxdm',
  /**
   * 民族代码
   */
  MZDM: 'mzdm',
  /**
   * 政治面貌代码
   */
  ZZMMDM: 'zzmmdm',
  /**
   * 当前状态代码
   */
  DQZTDM: 'dqztdm',
  /**
   * 用人方式代码
   */
  YRFSDM: 'yrfsdm',
  /**
   * 学历代码
   */
  XLDM: 'xldm',
  /**
   * 专业技术职务级别代码
   */
  GBZWJB: 'gbzwjb',
} as const;

/**
 * 代码类型
 */
type DM_TYPE = (typeof DM_TYPES)[keyof typeof DM_TYPES];

/**
 * 根据key获取token
 * @param param0 key相关参数
 * @returns token
 */
export async function gen_token({ key }: GEN_TOKEN_PARAMS) {
  const response = await fetch(`${YNU_API_HOST}/gen_token?${new URLSearchParams({ key })}`);
  if (!response.ok) {
    throw new Error(`Failed to get gen_token from YNU API, ${response.statusText}`);
  }
  return response.text();
}

/**
 * 获取教职工列表
 * @param params 教职工列表参数
 * @param param1 token相关参数
 * @returns 教职工列表
 */
export async function list_jzg(params: LIST_JZG_PARAMS = { dep: '3004' }, { authorization }: AUTHORIZATION_INFO) {
  const url = new URL(`${YNU_API_HOST}/v1/rs/list_jzg`);
  if (!is_null_or_undefined_or_empty_object(params)) {
    url.search = new URLSearchParams({ ...params }).toString();
  }
  const response = await fetch(url, {
    headers: { Authorization: `${authorization}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to get list_jzg from YNU API, ${response.statusText}`);
  }
  const response_json: LIST_JZG_RESPONSE = await response.json();
  if (response_json.success === false) {
    throw new Error(`Failed to get list_jzg from YNU API, ${response_json.msg}`);
  }
  return response_json.data;
}

/**
 * 获取教职工详细信息
 * @param params 教职工详细信息参数
 * @param param1 token相关参数
 * @returns 教职工详细信息
 */
export async function detail_jzg(params: DETAIL_JZG_PARAMS = { zgh: [] }, { authorization }: AUTHORIZATION_INFO) {
  const url = new URL(`${YNU_API_HOST}/v1/rs/detail_jzg`);
  if (!is_null_or_undefined_or_empty_object(params) && params.zgh) {
    url.search = new URLSearchParams(params.zgh.map((item) => ['zgh', item])).toString();
  }
  const response = await fetch(url, {
    headers: { Authorization: `${authorization}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to get detail_jzg from YNU API, ${response.statusText}`);
  }
  const response_json: DETAIL_JZG_RESPONSE = await response.json();
  if (response_json.success === false) {
    throw new Error(`Failed to get detail_jzg from YNU API, ${response_json.msg}`);
  }
  return response_json.data;
}

/**
 * 获取代码信息
 * @param dm 代码类型
 * @param params 代码信息参数
 * @param param2 token相关参数
 * @returns 代码信息
 */
export async function rs_dm(dm: DM_TYPE, params: DM_PARAMS = {}, { authorization }: AUTHORIZATION_INFO) {
  const url = new URL(`${YNU_API_HOST}/v1/rs/dm_${dm}`);
  if (!is_null_or_undefined_or_empty_object(params) && params.dm) {
    const { dm } = params;
    url.search = new URLSearchParams({ dm }).toString();
  }
  const response = await fetch(url, {
    headers: { Authorization: `${authorization}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to get rs_dm of ${dm} from YNU API, ${response.statusText}`);
  }
  const response_json: dm_response = await response.json();
  if (response_json.success === false) {
    throw new Error(`Failed to get rs_dm of ${dm} from YNU API, ${response_json.msg}`);
  }
  return response_json.data;
}
