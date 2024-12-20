// Code generated by @sumup/ts-sdk-gen@0.0.1. DO NOT EDIT.

import * as Core from "../../core";

/**
 * Object attributes that modifiable only by SumUp applications.
 */
export type Attributes = Record<string, Record<string, unknown>>;

/**
 * Invite
 *
 * Pending invitation for membership.
 *
 */
export type Invite = {
  /**
   * Email address of the invited user.
   */
  email: string;
  expires_at: string;
};

/**
 * Set of user-defined key-value pairs attached to the object. Partial updates are not supported. When updating, always submit whole metadata.
 */
export type Metadata = Record<string, Record<string, unknown>>;

export type MembershipStatus =
  | "accepted"
  | "pending"
  | "expired"
  | "disabled"
  | "unknown";

/**
 * Classic identifiers of the user.
 */
export type MembershipUserClassic = { user_id: number };

/**
 * User information.
 */
export type MembershipUser = {
  classic?: MembershipUserClassic;
  /**
   * Time when the user has been disabled. Applies only to virtual users (`virtual_user: true`).
   *
   */
  disabled_at?: string;
  /**
   * End-User's preferred e-mail address. Its value MUST conform to the RFC 5322 [RFC5322] addr-spec syntax. The RP MUST NOT rely upon this value being unique, for unique identification use ID instead.
   *
   */
  email: string;
  /**
   * Identifier for the End-User (also called Subject).
   */
  id: string;
  /**
   * True if the user has enabled MFA on login.
   *
   */
  mfa_on_login_enabled: boolean;
  /**
   * User's preferred name. Used for display purposes only.
   *
   */
  nickname?: string;
  /**
   * URL of the End-User's profile picture. This URL refers to an image file (for example, a PNG, JPEG, or GIF image file), rather than to a Web page containing an image.
   *
   */
  picture?: string;
  /**
   * True if the user is a virtual user (operator).
   *
   */
  virtual_user: boolean;
};

/**
 * Member
 *
 * A member is user within specific resource identified by resource id, resource type, and associated roles.
 *
 */
export type Member = {
  attributes?: Attributes;
  created_at: string;
  /**
   * ID of the member.
   */
  id: string;
  invite?: Invite;
  metadata?: Metadata;
  /**
   * User's permissions.
   */
  permissions: string[];
  /**
   * User's roles.
   */
  roles: string[];
  status: MembershipStatus;
  updated_at: string;
  user?: MembershipUser;
};

export type ListMerchantMembersQueryParams = {
  offset?: number;
  limit?: number;
  scroll?: boolean;
  email?: string;
  status?: MembershipStatus;
  roles?: string[];
};

export type ListMerchantMembersResponse = {
  items: Member[];
  total_count?: number;
};

export type CreateMerchantMemberParams = {
  attributes?: Attributes;
  /**
   * Email address of the member to add.
   */
  email: string;
  /**
   * True if the user is managed by the merchant. In this case, we'll created a virtual user with the provided password and nickname.
   *
   */
  is_managed_user?: boolean;
  metadata?: Metadata;
  /**
   * Nickname of the member to add. Only used if `is_managed_user` is true. Used for display purposes only.
   *
   */
  nickname?: string;
  /**
   * Password of the member to add. Only used if `is_managed_user` is true.
   */
  password?: string;
  /**
   * List of roles to assign to the new member.
   */
  roles: string[];
};

export type UpdateMerchantMemberParams = {
  attributes?: Attributes;
  metadata?: Metadata;
  roles?: string[];
  /**
   * Allows you to update user data of managed users.
   */
  user?: {
    /**
     * User's preferred name. Used for display purposes only.
     *
     */
    nickname?: string;
    /**
     * Password of the member to add. Only used if `is_managed_user` is true.
     */
    password?: string;
  };
};

export class Members extends Core.APIResource {
  /**
   * List members
   */
  list(
    merchantCode: string,
    query?: ListMerchantMembersQueryParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.get<void>({
      path: `/v0.1/merchants/${merchantCode}/members`,
      query,
      ...params,
    });
  }

  /**
   * Create a merchant member.
   */
  create(
    merchantCode: string,
    body: CreateMerchantMemberParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<Member> {
    return this._client.post<Member>({
      path: `/v0.1/merchants/${merchantCode}/members`,
      body,
      ...params,
    });
  }

  /**
   * Get merchant member
   */
  get(
    merchantCode: string,
    memberId: string,
    params?: Core.FetchParams,
  ): Core.APIPromise<Member> {
    return this._client.get<Member>({
      path: `/v0.1/merchants/${merchantCode}/members/${memberId}`,
      ...params,
    });
  }

  /**
   * Update merchant member
   */
  update(
    merchantCode: string,
    memberId: string,
    body: UpdateMerchantMemberParams,
    params?: Core.FetchParams,
  ): Core.APIPromise<Member> {
    return this._client.put<Member>({
      path: `/v0.1/merchants/${merchantCode}/members/${memberId}`,
      body,
      ...params,
    });
  }

  /**
   * Delete member
   */
  delete(
    merchantCode: string,
    memberId: string,
    params?: Core.FetchParams,
  ): Core.APIPromise<void> {
    return this._client.delete<void>({
      path: `/v0.1/merchants/${merchantCode}/members/${memberId}`,
      ...params,
    });
  }
}

export declare namespace Members {
  export type {
    Attributes,
    CreateMerchantMemberParams,
    Invite,
    ListMerchantMembersQueryParams,
    Member,
    MembershipStatus,
    MembershipUser,
    MembershipUserClassic,
    Metadata,
    UpdateMerchantMemberParams,
  };
}
