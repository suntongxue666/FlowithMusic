// 广告配置文件
export interface AdConfig {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

// 默认广告配置
export const defaultAdConfig: AdConfig = {
  imageUrl: 'https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/WebAD-FlowithMusi-700x150.jpg',
  linkUrl: 'https://apps.apple.com/app/apple-store/id6760930546?pt=128513674&ct=web.com_0331&mt=8',
  altText: 'Musight App Advertisement'
};

// 可以在这里添加更多广告配置
export const adConfigs = {
  default: defaultAdConfig,
  // 其他广告配置可以在这里添加
};