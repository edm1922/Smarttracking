import { Module } from '@nestjs/common';
import { CategoriesService } from './categories/categories.service';
import { TagsService } from './tags/tags.service';
import { BatchesService } from './batches/batches.service';
import { WorkflowService } from './workflow/workflow.service';
import {
  CategoriesController,
  TagsController,
  BatchesController,
  WorkflowController,
} from './management.controllers';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    CategoriesController,
    TagsController,
    BatchesController,
    WorkflowController,
  ],
  providers: [
    CategoriesService,
    TagsService,
    BatchesService,
    WorkflowService,
  ],
  exports: [
    CategoriesService,
    TagsService,
    BatchesService,
    WorkflowService,
  ],
})
export class ManagementModule {}
