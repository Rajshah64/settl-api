import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from 'src/users/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService:UserService,
    private readonly jwtService: JwtService,

  ){}
  async register(registerdto: RegisterDto){
    //Step 1:- take the data and create its variable. 
    const { email, password }= registerdto;

    //validate if the user already exists
    const existingUser= await this.userService.findByEmail(email);
    if(existingUser){
        throw new ConflictException("This email is already under use. Try with another email.")
    }

    //step2 :- create bcrypt
    const hashedPassword = await bcrypt.hash(password,10);

    const user= await this.userService.create(
      {
        ...registerdto,
        password:hashedPassword,
      }
    )

    // Generate JWT
    const payload = {
    sub: user.id,
    email: user.email,
    };

    //Create accessToken. This is temporary one.
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
    };
  }

  async login(logindto: LoginDto){
    //extract email and password from logindto
    const {email,password}= logindto;

    //validate if the user exists
    const user= await this.userService.findByEmail(email);
    if(!user){
      throw new UnauthorizedException("Invalid email or password");
    }

    //validate the password with the hlep of bcrypt compare function.
    const isPasswordValid= await bcrypt.compare(password,user.password);
    if(!isPasswordValid){
      throw new UnauthorizedException("Invalid email or password");
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
    };
    
    //This is the JWT token which is generated after the user is authenticated. This will be used for further requests to the server.
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
    };

  }
}
