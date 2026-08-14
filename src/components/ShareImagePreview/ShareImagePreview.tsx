type Props = {
  visible: boolean
  dataUrl: string
  fileName: string
  onClose: () => void
}

export const ShareImagePreview = ({ visible, dataUrl, fileName, onClose }: Props) => {
  if (!visible) return null

  return (
    <div className="share-preview" role="dialog" aria-modal="true" aria-label="分享图片预览">
      <button type="button" className="share-preview__backdrop" aria-label="关闭预览" onClick={onClose} />
      <div className="share-preview__panel">
        <div className="share-preview__head">
          <strong>保存分享图片</strong>
          <button type="button" className="share-preview__close" onClick={onClose}>
            关闭
          </button>
        </div>
        <img
          className="share-preview__image"
          src={dataUrl}
          alt={fileName}
        />
        <p className="share-preview__hint">长按图片，选择「存储到相册」或「保存图片」</p>
      </div>
    </div>
  )
}
