import { Metadata } from 'next';
import UploadPortal from './UploadPortal';

export const metadata: Metadata = {
  title: 'iLyrics Portal - Upload Local Lyrics',
  description: 'Easily upload and sync your local .lrc and .ttml lyrics files to your iOS device using iLyrics.',
  keywords: 'ilyrics, lyrics sync, lrc upload, ttml, flowith music',
  openGraph: {
    title: 'iLyrics Portal',
    description: 'Sync local lyrics to your iOS device',
    url: 'https://flowithmusic.com/ilyrics',
    siteName: 'Flowith Music',
    images: [
      {
        url: 'https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/FlowithMusic-Group.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function Page() {
  return <UploadPortal />;
}
