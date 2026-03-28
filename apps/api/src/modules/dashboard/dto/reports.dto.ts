export class ImportSummaryDto {
  totalBatches!: number;
  totalImportedRows!: number;
  totalFailedRows!: number;
  overallSuccessRate!: number;
  sourceDistribution!: {
    sourceType: string;
    count: number;
    percentage: number;
  }[];
  recentImports!: {
    batchId: string;
    sourceType: string;
    fileName: string;
    totalRows: number;
    successRows: number;
    failedRows: number;
    status: string;
    importedAt: Date;
  }[];
}

export class DataQualitySummaryDto {
  totalCustomers!: number;
  totalNeighborhoods!: number;
  customersWithNeighborhood!: number;
  neighborhoodCoverageRate!: number;
  topNeighborhoods!: {
    id: string;
    name: string;
    district: string;
    city: string;
    customerCount: number;
  }[];
}

export class ReportsSummaryDto {
  importSummary!: ImportSummaryDto;
  dataQuality!: DataQualitySummaryDto;
  generatedAt!: Date;
}
