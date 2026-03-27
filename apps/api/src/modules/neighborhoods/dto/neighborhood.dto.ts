export class NeighborhoodDto {
  id!: string;
  name!: string;
  district!: string;
  city!: string;
  customerCount?: number;
}

export class NeighborhoodsListResponseDto {
  neighborhoods!: NeighborhoodDto[];
  total!: number;
}
