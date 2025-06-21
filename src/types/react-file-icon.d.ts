declare module 'react-file-icon' {
  export interface FileIconProps {
    extension?: string;
    type?: string;
    glyphColor?: string;
    labelColor?: string;
    labelUppercase?: boolean;
    labelTextColor?: string;
    foldColor?: string;
    gradientOpacity?: number;
    radius?: number;
    [key: string]: any;
  }

  export const FileIcon: React.FC<FileIconProps>;
  
  export interface DefaultStylesType {
    [key: string]: {
      labelColor?: string;
      type?: string;
      glyphColor?: string;
      [key: string]: any;
    };
  }
  
  export const defaultStyles: DefaultStylesType;
  
  export default FileIcon;
} 