import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import { FindOperator } from "typeorm";
import { IsNotEmpty } from "class-validator";

export class UpdateUserDto extends PartialType(CreateUserDto) {

    @ApiProperty({
        example: 'uuid-user-id',
        description: 'User ID to be updated',
    })
    // Sử dụng FindOperator để hỗ trợ việc kiểm tra không rỗng khi cập nhật
    // Nếu không sử dụng FindOperator, giá trị chuỗi rỗng sẽ bị bỏ qua do PartialType
    @IsNotEmpty({ message: 'User ID is required' })
    id: string | FindOperator<string>;
}
