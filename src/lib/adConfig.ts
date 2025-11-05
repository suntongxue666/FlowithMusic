// 广告配置文件
export interface AdConfig {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

// 默认广告配置
export const defaultAdConfig: AdConfig = {
  imageUrl: 'https://ciwjjfcuhubjydajazkk.supabase.co/storage/v1/object/public/webstie-icon/WebAD-Petogether-700x150.png',
  linkUrl: 'https://apps.apple.com/app/apple-store/id6754391749?pt=118914236&ct=FlowithmusicWeb&mt=8',
  altText: 'Petogether App Advertisement'
};

// 可以在这里添加更多广告配置
export const adConfigs = {
  default: defaultAdConfig,
  // 其他广告配置可以在这里添加
};