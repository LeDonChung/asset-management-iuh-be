import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateAlertImageDto {
    
    @ApiProperty({
        example: 'image.png',
        description: 'The image file to upload'
    })
    @IsNotEmpty({ message: 'Image file must not be empty' })
    file: Express.Multer.File;

    @ApiProperty({
        example: ['uuid-alert-id-1', 'uuid-alert-id-2'],
        description: 'List of alert IDs to update the image for'
    })
    @IsString({ each: true })
    @IsNotEmpty({ message: 'Alert IDs must not be empty' })
    alertIds: string[] = [];
}