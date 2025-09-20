import { ApiProperty } from "@nestjs/swagger";

export class UserLoginResponse {
  @ApiProperty({ example: "1", description: "User ID" })
  id: string;
  @ApiProperty({ example: "johndoe", description: "Username" })
  username: string;
  @ApiProperty({ example: "john@gmail.com", description: "Email address" })
  email?: string;
  @ApiProperty({ example: "0123456789", description: "Phone number" })
  phoneNumber?: string;
  @ApiProperty({ example: "1990-01-01", description: "Birth date" })
  birthDate?: string;
  @ApiProperty({ example: "John Doe", description: "Full name" })
  fullName: string;
  @ApiProperty({ example: "true", description: "Is the user active?" })
  roles: string[];
  @ApiProperty({ example: "true", description: "Is the user active?" })
  permissions: string[];
}
