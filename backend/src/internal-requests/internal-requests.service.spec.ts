import { Test, TestingModule } from '@nestjs/testing';
import { InternalRequestsService } from './internal-requests.service';

describe('InternalRequestsService', () => {
  let service: InternalRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternalRequestsService],
    }).compile();

    service = module.get<InternalRequestsService>(InternalRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
