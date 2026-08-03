import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityLog } from "./entity/activity-log.entity";
// import { JwtModule } from "@nestjs/jwt";
import { Module } from "@nestjs/common";
import { ActivityLogService } from "./activity-log.service";
import { ActivityController } from "./activity.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLog]),
    // JwtModule
  ],
  controllers: [ActivityController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityModule {}