'use client'

import { QRCode } from 'react-qrcode-logo'

export default function LetterQRCode() {
  const url = typeof window !== "undefined" ? window.location.href : ""
  
  return (
    <div className="letter-qr-code">
      <p className="qr-text">View / share on 📱</p>
      <QRCode
        value={url}
        size={96}
        logoImage="/favicon.png"
        logoWidth={24}
        logoHeight={24}
        quietZone={0}
        qrStyle="squares"
        ecLevel="H"
        fgColor="#000000"
        bgColor="#ffffff"
      />
      
      <style jsx>{`
        .letter-qr-code {
          text-align: center;
          margin: 1rem 0;
          display: none;
        }
        
        .qr-text {
          font-size: 12px;
          color: #666;
          text-align: center;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }
        
        /* 只在PC端显示 */
        @media (min-width: 769px) {
          .letter-qr-code {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}