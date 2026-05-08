interface Props {
  progress: number; // 0–100
  label: string;
}

export default function LoadingBar({ progress, label }: Props) {
  return (
    <div className="loading-bar-wrap">
      <div className="loading-bar-track">
        <div
          className="loading-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="loading-label">{label}</div>
    </div>
  );
}
