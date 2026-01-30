import { classEnum, timeSlots } from "../../constants";
import type { ClassType, TimeSlot } from "../../db/schema";
import { generateToken, verifyPassword } from "../../lib/auth";
import type { Region, Role } from "../../types";
import { EventsRepository } from "../events/events.repository";
import { UsersRepository } from "../users/users.repository";
import { SignupsRepository } from "./signups.repository";

export interface LoginDto {
  username: string;
  password: string;
}

export interface SignupDto {
  username: string;
  primaryClass: [ClassType, ClassType];
  secondaryClass?: [ClassType, ClassType];
  primaryRole: Role;
  secondaryRole?: Role;
  region: Region;
  timeSlots: TimeSlot[];
  notes?: string;
}

export interface DiscordSignupDto extends SignupDto {
  discordId: string;
}

export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private eventsRepository: EventsRepository,
    private signupsRepository: SignupsRepository,
  ) {}

  async login(dto: LoginDto) {
    const { username, password } = dto;

    if (!username || !password) {
      throw new Error("Tên đăng nhập và mật khẩu là bắt buộc");
    }

    const user = await this.usersRepository.findByUsername(username);

    if (!user || !user.password || !user.isAdmin) {
      throw new Error("Sai tên đăng nhập hoặc mật khẩu");
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error("Sai tên đăng nhập hoặc mật khẩu");
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      region: user.region,
      isAdmin: user.isAdmin ?? false,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        region: user.region,
        isAdmin: user.isAdmin,
      },
    };
  }

  async signup(dto: SignupDto) {
    this.validateSignupData(dto);

    const {
      username,
      primaryClass,
      secondaryClass,
      primaryRole,
      secondaryRole,
      region,
      timeSlots: selectedTimeSlots,
      notes,
    } = dto;

    // Get the most recent event for this region
    const event = await this.eventsRepository.findLatestByRegion(region);

    if (!event) {
      throw new Error("Không có sự kiện nào cho khu vực này");
    }

    // Check if user already exists
    let user = await this.usersRepository.findByUsername(username);

    if (user) {
      // Check if user's region matches
      if (user.region !== region) {
        throw new Error("Tên In-Game đã tồn tại ở khu vực khác");
      }

      // User exists - update their info
      user = await this.usersRepository.updateFull(user.id, {
        primaryClass,
        secondaryClass: secondaryClass || null,
        primaryRole,
        secondaryRole: secondaryRole || null,
      });
    } else {
      // Create new user (no password for regular users)
      user = await this.usersRepository.create({
        username,
        password: null,
        primaryClass,
        secondaryClass: secondaryClass || null,
        primaryRole,
        secondaryRole: secondaryRole || null,
        region,
        isAdmin: false,
      });
    }

    // Check if already signed up for this event
    const existingSignup = await this.signupsRepository.findByEventAndUser(
      event.id,
      user.id,
    );

    if (existingSignup) {
      await this.signupsRepository.update(event.id, user.id, {
        timeSlots: selectedTimeSlots,
        notes: notes || null,
      });

      return {
        message: "Đã đăng ký sự kiện này",
        user: {
          id: user.id,
          username: user.username,
          region: user.region,
          primaryClass: user.primaryClass,
          secondaryClass: user.secondaryClass,
          primaryRole: user.primaryRole,
          secondaryRole: user.secondaryRole,
        },
        event: {
          id: event.id,
          weekStartDate: event.weekStartDate,
        },
        updated: true,
      };
    }

    // Create event signup
    await this.signupsRepository.create({
      eventId: event.id,
      userId: user.id,
      timeSlots: selectedTimeSlots,
      notes: notes || null,
    });

    return {
      message: "Đăng ký tham gia thành công",
      user: {
        id: user.id,
        username: user.username,
        region: user.region,
        primaryClass: user.primaryClass,
        secondaryClass: user.secondaryClass,
        primaryRole: user.primaryRole,
        secondaryRole: user.secondaryRole,
      },
      event: {
        id: event.id,
        weekStartDate: event.weekStartDate,
      },
      updated: false,
    };
  }

  async discordSignup(dto: DiscordSignupDto) {
    this.validateSignupData(dto);

    const {
      discordId,
      username,
      primaryClass,
      secondaryClass,
      primaryRole,
      secondaryRole,
      region,
      timeSlots: selectedTimeSlots,
      notes,
    } = dto;

    if (!discordId) {
      throw new Error("Discord ID là bắt buộc");
    }

    // Get the most recent event for this region
    const event = await this.eventsRepository.findLatestByRegion(region);

    if (!event) {
      throw new Error("Không có sự kiện nào cho khu vực này");
    }

    const userByDiscord = await this.usersRepository.findByDiscordId(discordId);
    const userByUsername = await this.usersRepository.findByUsername(username);

    if (
      userByDiscord &&
      userByUsername &&
      userByDiscord.id !== userByUsername.id
    ) {
      throw new Error(
        "Tên In-Game đã tồn tại hoặc đã đăng ký với một tài khoản Discord khác",
      );
    }

    let user = userByDiscord || userByUsername;

    if (user) {
      // Check if user's region matches
      if (user.region !== region) {
        throw new Error("Tên In-Game đã tồn tại ở khu vực khác");
      }

      // User exists - update their info
      user = await this.usersRepository.updateFull(user.id, {
        discordId,
        username,
        primaryClass,
        secondaryClass: secondaryClass || null,
        primaryRole,
        secondaryRole: secondaryRole || null,
      });
    } else {
      // Create new user (no password for regular users)
      user = await this.usersRepository.create({
        discordId,
        username,
        password: null,
        primaryClass,
        secondaryClass: secondaryClass || null,
        primaryRole,
        secondaryRole: secondaryRole || null,
        region,
        isAdmin: false,
      });
    }

    // Check if already signed up for this event
    const existingSignup = await this.signupsRepository.findByEventAndUser(
      event.id,
      user.id,
    );

    if (existingSignup) {
      await this.signupsRepository.update(event.id, user.id, {
        timeSlots: selectedTimeSlots,
        notes: notes || null,
      });

      return {
        message: "Đã đăng ký sự kiện này",
        user: {
          id: user.id,
          discordId: user.discordId,
          username: user.username,
          region: user.region,
          primaryClass: user.primaryClass,
          secondaryClass: user.secondaryClass,
          primaryRole: user.primaryRole,
          secondaryRole: user.secondaryRole,
        },
        event: {
          id: event.id,
          weekStartDate: event.weekStartDate,
        },
        updated: true,
      };
    }

    // Create event signup
    await this.signupsRepository.create({
      eventId: event.id,
      userId: user.id,
      timeSlots: selectedTimeSlots,
      notes: notes || null,
    });

    return {
      message: "Đăng ký tham gia thành công",
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        region: user.region,
        primaryClass: user.primaryClass,
        secondaryClass: user.secondaryClass,
        primaryRole: user.primaryRole,
        secondaryRole: user.secondaryRole,
      },
      event: {
        id: event.id,
        weekStartDate: event.weekStartDate,
      },
      updated: false,
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }

    return {
      id: user.id,
      username: user.username,
      region: user.region,
      primaryClass: user.primaryClass,
      secondaryClass: user.secondaryClass,
      primaryRole: user.primaryRole,
      secondaryRole: user.secondaryRole,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };
  }

  private validateSignupData(dto: SignupDto) {
    const {
      username,
      primaryClass,
      secondaryClass,
      primaryRole,
      secondaryRole,
      region,
      timeSlots: selectedTimeSlots,
    } = dto;

    if (!username || !region || !primaryClass || !primaryRole) {
      throw new Error(
        "Tên In-Game, khu vực, vai trò chính và Build chính là bắt buộc",
      );
    }

    if (
      !selectedTimeSlots ||
      !Array.isArray(selectedTimeSlots) ||
      selectedTimeSlots.length === 0
    ) {
      throw new Error("Phải chọn ít nhất một khung giờ");
    }

    if (!selectedTimeSlots.every((slot) => timeSlots.includes(slot))) {
      throw new Error("Thời gian đã chọn không hợp lệ");
    }

    if (!Array.isArray(primaryClass) || primaryClass.length !== 2) {
      throw new Error("Vai trò chính phải là một mảng gồm đúng 2 vũ khí");
    }

    if (!primaryClass.every((cls) => classEnum.includes(cls))) {
      throw new Error("Vai trò chính không hợp lệ");
    }

    if (secondaryClass) {
      if (!Array.isArray(secondaryClass) || secondaryClass.length !== 2) {
        throw new Error("Vai trò phụ phải là một mảng gồm đúng 2 vũ khí");
      }
      if (!secondaryClass.every((cls) => classEnum.includes(cls))) {
        throw new Error("Vai trò phụ không hợp lệ");
      }
    }

    if (!["vn", "na"].includes(region)) {
      throw new Error("Khu vực phải là 'vn' hoặc 'na'");
    }

    if (!["dps", "healer", "tank"].includes(primaryRole)) {
      throw new Error("Vai trò chính phải là 'dps', 'healer', hoặc 'tank'");
    }

    if (secondaryRole && !["dps", "healer", "tank"].includes(secondaryRole)) {
      throw new Error("Vai trò phụ phải là 'dps', 'healer', hoặc 'tank'");
    }
  }
}
