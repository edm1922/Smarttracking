import { Test, TestingModule } from '@nestjs/testing';
import { InternalRequestsController } from './internal-requests.controller';

describe('InternalRequestsController', () => {
  let controller: InternalRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalRequestsController],
    }).compile();

    controller = module.get<InternalRequestsController>(
      InternalRequestsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
