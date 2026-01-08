import React from "react";
import { IconType } from "react-icons";
// import { FiFile  } from "react-icons/fi";
import DefaultIcon from "./file_icons/defaultFile.svg";

// SVG icons (SVGR)
import PdfIcon from "./file_icons/pdf.svg";
import DocIcon from "./file_icons/doc.svg";
import DocxIcon from "./file_icons/docx.svg";
import PptIcon from "./file_icons/ppt.svg";
import PptxIcon from "./file_icons/pptx.svg";
import PcxIcon from "./file_icons/pcx.svg";
import XlsIcon from "./file_icons/xls.svg";
import TxtIcon from "./file_icons/txt.svg";
import JpgIcon from "./file_icons/jpg.svg";
import PngIcon from "./file_icons/png.svg";

// Audio
import Mp3Icon from "./file_icons/mp3.svg";
import Mp4Icon from "./file_icons/mp4.svg";
import WavIcon from "./file_icons/wav.svg";
import M4aIcon from "./file_icons/m4a.svg";
import WebmIcon from "./file_icons/webm.svg";
import MpegIcon from "./file_icons/mpeg.svg";
import MpgaIcon from "./file_icons/mpga.svg";

// Video
import { FcVideoFile } from "react-icons/fc";

/* -------------------------------------------------------
 * Types
 * ----------------------------------------------------- */

type IconComponent =
  | React.FC<React.SVGProps<SVGSVGElement>>
  | IconType;

type FileIconConfig = {
  icon: IconComponent;
  className?: string;
};

/* -------------------------------------------------------
 * Icon configuration map
 * ----------------------------------------------------- */

const fileIconMap: Record<string, FileIconConfig> = {
  // Documents
  pdf: { icon: PdfIcon },
  doc: { icon: DocIcon },
  docx: { icon: DocxIcon },
  ppt: { icon: PptIcon },
  pptx: { icon: PptxIcon },
  pcx: { icon: PcxIcon },
  xls: { icon: XlsIcon },
  xlsx: { icon: XlsIcon },
  txt: { icon: TxtIcon },

  // Images
  jpg: { icon: JpgIcon },
  jpeg: { icon: JpgIcon },
  png: { icon: PngIcon },

  // Audio / video
  mp3: { icon: Mp3Icon }, //{ icon: BsFiletypeMp3, className: "text-pink-500" },
  mp4: { icon: Mp4Icon },
  wav: { icon: WavIcon },
  m4a: { icon: M4aIcon },
  webm: { icon: WebmIcon },
  mpeg: { icon: MpegIcon },
  mpga: { icon: MpgaIcon },

  mkv: { icon: FcVideoFile, className: "text-pink-500"},
};

/* -------------------------------------------------------
 * Public API
 * ----------------------------------------------------- */


export const getFileIcon = (fileName: string): any=> {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  const config = fileIconMap[ext ?? ""];

  if (!config) {
    return  DefaultIcon({className:"w-6 h-6"}) as JSX.Element
  }

  const Icon = config.icon;

  return (
    Icon({className:`w-8 h-8 ${config.className ?? ""}`}) as JSX.Element
    
  );
};
