export type PlatformDashboardScreenProps = {
  newEnterpriseHref?: string;
  approvalQueueHref?: string;
  enterprisesLoader?: () => Promise<import("@ihp/enterprises").EnterpriseDto[]>;
};
