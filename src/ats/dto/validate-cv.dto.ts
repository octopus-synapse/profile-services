import { IsOptional, IsBoolean } from 'class-validator';

export class ValidateCVDto {
  @IsOptional()
  @IsBoolean()
  checkFormat?: boolean = true;

  @IsOptional()
  @IsBoolean()
  checkSections?: boolean = true;

  @IsOptional()
  @IsBoolean()
  checkGrammar?: boolean = false;

  @IsOptional()
  @IsBoolean()
  checkOrder?: boolean = true;

  @IsOptional()
  @IsBoolean()
  checkLayout?: boolean = true;
}
