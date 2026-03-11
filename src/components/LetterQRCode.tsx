'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function LetterQRCode() {
  const url = typeof window !== "undefined" ? window.location.href : ""

  return (
    <div className="letter-qr-code">
      <p className="qr-text">View / share on 📱</p>
      <div className="qr-container">
        <QRCodeSVG
          value={url}
          size={96}
          level="H"
          fgColor="#000000"
          bgColor="#ffffff"
          includeMargin={true}
        />
      </div>

      <style jsx>{`
        .letter-qr-code {
          text-align: center;
          margin: 1rem 0;
          display: none;
        }
        
        .qr-container {
          display: flex;
          justify-content: center;
          width: 100%;
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