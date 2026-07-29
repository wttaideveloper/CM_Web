import type { ReactNode, Ref } from "react";

export type AppFrameProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export type HeaderFrameProps = {
  headerRef?: Ref<HTMLElement>;
  left: ReactNode;
  right: ReactNode;
};

export type SidebarFrameProps = {
  desktopContent: ReactNode;
  mobileHeader: ReactNode;
  mobileContent: ReactNode;
  mobileOpen: boolean;
  onMobileSidebarClose: () => void;
};
