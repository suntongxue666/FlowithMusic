'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function LetterQRCode() {
  const url = typeof window !== "undefined" ? window.location.href : ""
  
  return (
    <div className="letter-qr-code">
      <QRCodeSVG
        value={url}
        size={128}
        level="H"
        fgColor="#000000"
        bgColor="#ffffff"
        includeMargin={true}
      />
      <p className="qr-text">Scan to open on your phone</p>
      
      <style jsx>{`
        .letter-qr-code {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          padding: 12px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
          z-index: 1000;
          display: none;
        }
        
        .qr-text {
          font-size: 10px;
          color: #666;
          text-align: center;
          margin: 8px 0 0 0;
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