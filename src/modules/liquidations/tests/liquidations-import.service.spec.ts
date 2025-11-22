import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

import { LiquidationsService } from '../liquidations.service';
import { LiquidationProposal } from 'src/entities/liquidation.entity';
import { LiquidationProposalItem } from 'src/entities/liquidation-proposal-item';
import { LiquidationHistory } from 'src/entities/liquidation-history.entity';
import { Asset } from 'src/entities/asset.entity';
import { AssetBookItem } from 'src/entities/asset-book-item.entity';
import { PermissionHelperService } from 'src/common/services/permission-helper.service';
import { AssetType } from 'src/common/shared/AssetType';
import { AssetStatus } from 'src/common/shared/AssetStatus';

describe('LiquidationsService - Import', () => {
  let service: LiquidationsService;
  let assetRepo: Repository<Asset>;
  let assetBookItemRepo: Repository<AssetBookItem>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiquidationsService,
        {
          provide: getRepositoryToken(LiquidationProposal),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(LiquidationProposalItem),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(LiquidationHistory),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Asset),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(AssetBookItem),
          useClass: Repository,
        },
        {
          provide: PermissionHelperService,
          useValue: {
            // Mock methods if needed
          },
        },
      ],
    }).compile();

    service = module.get<LiquidationsService>(LiquidationsService);
    assetRepo = module.get<Repository<Asset>>(getRepositoryToken(Asset));
    assetBookItemRepo = module.get<Repository<AssetBookItem>>(getRepositoryToken(AssetBookItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateExcelFile', () => {
    it('should throw error for invalid file type', () => {
      const file = {
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      expect(() => service['validateExcelFile'](file)).toThrow(BadRequestException);
    });

    it('should throw error for file too large', () => {
      const file = {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 11 * 1024 * 1024, // 11MB
      } as Express.Multer.File;

      expect(() => service['validateExcelFile'](file)).toThrow(BadRequestException);
    });

    it('should pass validation for valid Excel file', () => {
      const file = {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
      } as Express.Multer.File;

      expect(() => service['validateExcelFile'](file)).not.toThrow();
    });
  });

  describe('parseQuantity', () => {
    it('should parse valid number', () => {
      const result = service['parseQuantity']('5', 'Test field', 1);
      expect(result.quantity).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should return error for negative number', () => {
      const result = service['parseQuantity']('-1', 'Test field', 1);
      expect(result.error).toContain('phải là số nguyên >= 0');
    });

    it('should return error for non-number', () => {
      const result = service['parseQuantity']('abc', 'Test field', 1);
      expect(result.error).toContain('phải là số nguyên >= 0');
    });

    it('should return error for empty value', () => {
      const result = service['parseQuantity']('', 'Test field', 1);
      expect(result.error).toContain('không được để trống');
    });
  });

  describe('checkDuplicatesInImport', () => {
    it('should detect duplicate assets', () => {
      const items = [
        { fixedCode: 'ASSET001', ktCode: 'KT001' },
        { fixedCode: 'ASSET002', ktCode: 'KT002' },
        { fixedCode: 'ASSET001', ktCode: 'KT001' }, // duplicate
      ];

      const errors = service['checkDuplicatesInImport'](items);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('bị trùng lặp');
    });

    it('should return no errors for unique assets', () => {
      const items = [
        { fixedCode: 'ASSET001', ktCode: 'KT001' },
        { fixedCode: 'ASSET002', ktCode: 'KT002' },
        { fixedCode: 'ASSET003', ktCode: 'KT003' },
      ];

      const errors = service['checkDuplicatesInImport'](items);
      expect(errors).toHaveLength(0);
    });
  });
});
