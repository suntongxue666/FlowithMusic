// 广告配置文件
export interface AdConfig {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

// 默认第一个广告 (FlowithMusic)
export const flowithAd: AdConfig = {
  imageUrl: 'https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/WebAD-FlowithMusi-700x150.jpg',
  linkUrl: 'https://apps.apple.com/app/apple-store/id6760930546?pt=128513674&ct=web.com_0331&mt=8',
  altText: 'FlowithMusic App'
};

// 第二个广告 (iLyrics)
export const iLyricsAd: AdConfig = {
  imageUrl: 'https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/WebAD-iLyrics-700x150.jpg',
  linkUrl: 'https://apps.apple.com/app/apple-store/id6758751610?pt=128513674&ct=Flowweb-0404&mt=8',
  altText: 'iLyrics App'
};

// 默认广告配置
export const defaultAdConfig: AdConfig = flowithAd;

// 轮播广告列表
export const adList: AdConfig[] = [flowithAd, iLyricsAd];

// 配置文件导出
export const adConfigs = {
  default: defaultAdConfig,
  list: adList
};