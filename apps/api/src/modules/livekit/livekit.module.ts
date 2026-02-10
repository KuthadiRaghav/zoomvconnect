import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LivekitService } from "./livekit.service";

@Global()
@Module({
    providers: [LivekitService],
    exports: [LivekitService],
})
export class LivekitModule { }
