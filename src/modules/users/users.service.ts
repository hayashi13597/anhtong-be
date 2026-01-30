import { classEnum } from "../../constants";
import type { ClassType } from "../../db/schema";
import type { Region, Role } from "../../types";
import { UsersRepository } from "./users.repository";

export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async getAllUsers(region: Region) {
    return this.usersRepository.findAll(region);
  }

  async getUserById(id: number) {
    return this.usersRepository.findByIdWithColumns(id);
  }

  async updateUser(
    currentUser: { id: number; isAdmin: boolean; region: string },
    userId: number,
    data: {
      primaryClass?: [ClassType, ClassType];
      secondaryClass?: [ClassType, ClassType];
      primaryRole?: Role;
      secondaryRole?: Role;
    },
  ) {
    // Check permission: own profile or admin for same region
    if (currentUser.id !== userId) {
      if (!currentUser.isAdmin) {
        throw new Error("Cannot update other users");
      }

      // Admin can only update users in their region
      const targetUser = await this.usersRepository.findById(userId);
      if (!targetUser || targetUser.region !== currentUser.region) {
        throw new Error("User not found or in different region");
      }
    }

    // Validate primary class
    if (data.primaryClass) {
      if (!Array.isArray(data.primaryClass) || data.primaryClass.length !== 2) {
        throw new Error("Primary class must be an array of exactly 2 classes");
      }
      if (!data.primaryClass.every((cls) => classEnum.includes(cls))) {
        throw new Error("Invalid primary class");
      }
    }

    // Validate secondary class
    if (data.secondaryClass) {
      if (
        !Array.isArray(data.secondaryClass) ||
        data.secondaryClass.length !== 2
      ) {
        throw new Error(
          "Secondary class must be an array of exactly 2 classes",
        );
      }
      if (!data.secondaryClass.every((cls) => classEnum.includes(cls))) {
        throw new Error("Invalid secondary class");
      }
    }

    // Validate roles
    if (
      data.primaryRole &&
      !["dps", "healer", "tank"].includes(data.primaryRole)
    ) {
      throw new Error("Primary role must be 'dps', 'healer', or 'tank'");
    }

    if (
      data.secondaryRole &&
      !["dps", "healer", "tank"].includes(data.secondaryRole)
    ) {
      throw new Error("Secondary role must be 'dps', 'healer', or 'tank'");
    }

    return this.usersRepository.update(userId, {
      ...(data.primaryClass !== undefined && {
        primaryClass: data.primaryClass,
      }),
      ...(data.secondaryClass !== undefined && {
        secondaryClass: data.secondaryClass,
      }),
      ...(data.primaryRole && { primaryRole: data.primaryRole }),
      ...(data.secondaryRole !== undefined && {
        secondaryRole: data.secondaryRole,
      }),
    });
  }

  async deleteUser(currentUser: { region: string }, userId: number) {
    const targetUser = await this.usersRepository.findById(userId);
    if (!targetUser || targetUser.region !== currentUser.region) {
      throw new Error("User not found or in different region");
    }

    await this.usersRepository.delete(userId);
  }
}
