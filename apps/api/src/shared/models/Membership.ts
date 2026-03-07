import mongoose, { Document, Schema, Types } from "mongoose";

export type MembershipRole = "owner" | "admin" | "agent";

export interface IMembership extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    organizationId: Types.ObjectId;
    role: MembershipRole;
    inviteStatus: "pending" | "active" | "inactive";
    invitedBy?: Types.ObjectId;
    invitedAt?: Date;
    inviteExpiresAt?: Date;
    activatedAt?: Date;
    teams: Types.ObjectId[];
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
        role: {
            type: String,
            enum: ["owner", "admin", "agent"],
            required: true,
            default: "agent",
        },
        inviteStatus: {
            type: String,
            enum: ["pending", "active", "inactive"],
            default: "pending",
        },
        invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        invitedAt: { type: Date, default: null },
        inviteExpiresAt: { type: Date, default: null },
        activatedAt: { type: Date, default: null },
        teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
        permissions: [{ type: String }],
    },
    { timestamps: true },
);

// A user can only have one membership per organization
membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
membershipSchema.index({ organizationId: 1, role: 1 });
membershipSchema.index({ organizationId: 1, inviteStatus: 1 });

export const Membership = mongoose.model<IMembership>("Membership", membershipSchema);
