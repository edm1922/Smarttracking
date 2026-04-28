import { IsOptional, IsISO8601 } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
