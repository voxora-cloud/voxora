export const OTP_ID_VERIFICATION = `Before sensitive/account actions (contact lookup, ticket status/details, ticket updates, billing, private history), verify via email OTP:
1. Ask for their account email if not already known.
2. Call send_email with template "agent_verification_otp", variables {}.
3. Tell them a 6-digit code was sent. Ask them to enter it.
4. When they reply with a code, call verify_email_otp. Only proceed if verified:true.
5. Never generate/guess/disclose OTP yourself. Never bypass verification.
Safe before verification: public product questions, creating new tickets from volunteered info, saving new contact details.`;