import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { authApi } from "../api/auth.api";

export const useSignup = () => {
    const signup = useAuthStore((state) => state.signup);

    return useMutation({
        mutationFn: (data: any) => signup(data),
    });
};

export const useInitiateSignup = () => {
    return useMutation({
        mutationFn: (data: { name: string; email: string }) => authApi.initiateSignup(data),
    });
};

export const useCompleteSignup = () => {
    const completeSignup = useAuthStore((state) => state.completeSignup);

    return useMutation({
        mutationFn: (data: any) => completeSignup(data),
    });
};
