import { CollectUserInfo } from "../../../chat.types";

export interface VisitorFieldSummary {
    wantsAny: boolean;
    enabled: "true" | "false";
    fieldList: string;
}

export function getVisitorFieldSummary(
    collectUserInfo?: CollectUserInfo
): VisitorFieldSummary {
    const wantsName = collectUserInfo?.name === true;
    const wantsEmail = collectUserInfo?.email === true;
    const wantsPhone = collectUserInfo?.phone === true;
    const wantsAny = wantsName || wantsEmail || wantsPhone;

    const fields: string[] = [];
    if (wantsName) fields.push("name");
    if (wantsEmail) fields.push("email");
    if (wantsPhone) fields.push("phone (optional)");

    return {
        wantsAny,
        enabled: wantsAny ? "true" : "false",
        fieldList: fields.length > 0 ? fields.join(", ") : "(none)",
    };
}