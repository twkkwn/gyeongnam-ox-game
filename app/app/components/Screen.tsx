'use client'
import { JSX, PropsWithChildren } from 'react'
import Image from 'next/image'

type Props = PropsWithChildren<{ image: string; hotspots?: JSX.Element; id?: string; bg?: string }>

export default function Screen({ image, hotspots, id = 'app-screen', bg}: Props) {
  return (
    <div className="app-shell">
      <div className="screen-frame" style={bg ? ({ background: bg} as React.CSSProperties) : undefined}>
        <div id={id} className="fit-box">
          <Image
            className="screen-img"
            src={image}
            alt="screen"
            width={1152}
            height={2048}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
          {/* 투명 클릭 영역: 이미지 박스와 동일한 좌표계 */}
          <div className="hotspot" aria-hidden>{hotspots}</div>
        </div>
      </div>
    </div>
  )
}