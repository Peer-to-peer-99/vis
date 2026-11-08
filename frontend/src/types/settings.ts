export interface IdentitySettings {
  lawyerName: string;
  officeName: string;
  logo: HTMLImageElement | null;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
}
