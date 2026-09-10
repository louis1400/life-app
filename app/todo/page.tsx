import type { Metadata } from "next";
import Todo from "./todo";
export const metadata: Metadata = { title: "To-do · life-app", description: "Your tasks." };
export default function TodoPage() { return <Todo />; }
