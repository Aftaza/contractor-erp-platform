import { useState } from "react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTIgOEMxMC4zNDMgOCA5IDkuMzQzIDkgMTFDOSAxMi42NTcgMTAuMzQzIDE0IDEyIDE0QzEzLjY1NyAxNCAxNSAxMi42NTcgMTUgMTFDMTUgOS4zNDMgMTMuNjU3IDggMTIgOFoiIGZpbGw9IiM5Q0EzQUYiLz48cGF0aCBkPSJNNSAyMEMzLjM0MyAyMCAyIDE4LjY1NyAyIDE3VjE1QzIgMTMuMzQzIDMuMzQzIDEyIDUgMTJIMTlDMjAuNjU3IDEyIDIyIDEzLjM0MyAyMiAxNVYxN0MyMiAxOC42NTcgMjAuNjU3IDIwIDE5IDIwSDVaIiBmaWxsPSIjOUNBM0FGIi8+PC9zdmc+";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, ...rest } = props;

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ""}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={ERROR_IMG_SRC}
            alt="Error loading image"
            {...rest}
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={() => setDidError(true)}
    />
  );
}
