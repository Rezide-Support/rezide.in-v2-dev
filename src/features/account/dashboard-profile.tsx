"use client";
import { useSession } from "@/stores/session";
import { MyProfilePage } from "@/features/dashboard/profiles";
import { AccountView } from "./account-view";
export function DashboardProfile() { const {session} = useSession(); return session?.user.role === "realtor" ? <MyProfilePage/> : <AccountView/>; }
