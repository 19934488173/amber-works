type Props = {
  variant?: "compact" | "full";
  className?: string;
};

export const StudioBrand = ({ variant = "compact", className = "" }: Props) => (
  <div className={`studio-brand studio-brand--${variant} ${className}`.trim()}>
    <span className="studio-brand__mark" aria-hidden="true">
      康
    </span>
    <div className="studio-brand__text">
      <span className="studio-brand__name">KANG STUDIO</span>
      {variant === "full" ? (
        <p className="studio-brand__caption">婚礼跟妆与生活妆档期管理</p>
      ) : null}
    </div>
  </div>
);
