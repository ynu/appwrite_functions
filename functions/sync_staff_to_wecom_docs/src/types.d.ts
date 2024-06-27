// https://stackoverflow.com/questions/42233987/how-to-configure-custom-global-interfaces-d-ts-files-for-typescript

export {};

declare global {
  interface REQ_TYPE {
    bodyRaw: string;
    body: any;
    headers: any;
    method: string;
    host: string;
    scheme: string;
    query: any;
    queryString: string;
    port: number;
    url: string;
  }

  interface RES_TYPE {
    json: (data: any, statusCode?: number, headers?: any) => void;
    send: (data: any, statusCode?: number, headers?: any) => void;
    empty: () => void;
    redirect: (url: any, statusCode?: number, headers?: any) => void;
  }

  interface LOG_TYPE {
    (message: any): void;
  }
  interface ERROR_TYPE {
    (message: any): void;
  }

  interface GEN_TOKEN_PARAMS {
    key: string;
  }

  interface AUTHORIZATION_INFO {
    authorization: string;
  }

  interface GENERAL_RESPONSE {
    msg: string | null;
    success: boolean;
  }

  interface LIST_JZG_PARAMS {
    /**
     * 单位代码
     */
    dep?: string;
    /**
     * 当前状态代码
     */
    dqztdm?: string;
    /**
     * 用人方式代码
     */
    yrfsdm?: string;
  }

  interface LIST_JZG_RESPONSE extends GENERAL_RESPONSE {
    data: { XM: string; ZGH: string }[];
  }

  interface DETAIL_JZG_PARAMS {
    /**
     * 职工号
     */
    zgh?: string[];
  }

  interface DETAIL_JZG_RESPONSE extends GENERAL_RESPONSE {
    data: {
      /**
       * 组织机构代码
       */
      YXDM: string;
      /**
       * 民族代码
       */
      MZDM: string;
      /**
       * 姓名
       */
      XM: string;
      /**
       * 政治面貌代码
       */
      ZZMMDM: string;
      /**
       * 当前状态代码
       */
      DQZTDM: string;
      /**
       * 职工号
       */
      ZGH: string;
      /**
       * 用人方式代码
       */
      YRFSDM: string;
      /**
       * 最高学历代码
       */
      ZGXLDM: string;
      /**
       * 专业技术职务级别代码
       */
      ZYJSZWJBDM: string | null;
      /**
       * 额外代码名称信息
       */
      /**
       * 民族名称
       */
      MZMC?: string;
      /**
       * 政治面貌名称
       */
      ZZMMMC?: string;
      /**
       * 当前状态名称
       */
      DQZTMC?: string;
      /**
       * 用人方式名称
       */
      YRFSMC?: string;
      /**
       * 最高学历名称
       */
      XLMC?: string;
      /**
       * 专业技术职务级别名称
       */
      ZYJSZWJBMC?: string;
    }[];
  }

  interface DM_PARAMS {
    /**
     * 代码
     */
    dm?: string;
  }

  export interface DM_GENERAL_DATA {
    /**
     * 代码
     */
    DM: string;
    /**
     * 名称
     */
    MC: string;
  }

  interface dm_response extends GENERAL_RESPONSE {
    data: DM_GENERAL_DATA[];
  }
}
