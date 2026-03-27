export class CustomerDto {
  id!: string;
  externalId!: string;
  name!: string;
  email?: string;
  phone?: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  district?: string;
  city?: string;
  sourceType!: string;
  snapshotAt!: Date;
}

export class CustomersListResponseDto {
  customers!: CustomerDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}
