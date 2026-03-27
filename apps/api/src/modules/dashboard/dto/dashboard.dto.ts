export class DashboardMetricsDto {
  totalCustomers!: number;
  totalNeighborhoods!: number;
  latestImport?: {
    batchId: string;
    fileName: string;
    importedRows: number;
    failedRows: number;
    status: string;
    importedAt: Date;
  };
  importSuccessRate!: number;
  dataSourceStatus!: {
    type: string;
    description: string;
    lastSync: Date | null;
  };
}
