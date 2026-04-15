"use client";
import Link from "next/link";
import React, { useState } from "react";

export default function SigninWithPassword() {
  const [data, setData] = useState({
    username: "",
    password: process.env.NEXT_PUBLIC_DEMO_USER_PASS || "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // You can remove this code block
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-900">
          User name
        </label>
        <div className="relative flex items-center">
          <input
            name="username"
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-4 py-3 pr-8 text-sm text-slate-900 outline-blue-600"
            placeholder="Enter user name"
            value={data.username}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-900">
          Password
        </label>
        <div className="relative flex items-center">
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-slate-300 px-4 py-3 pr-8 text-sm text-slate-900 outline-blue-600"
            placeholder="Enter password"
            value={data.password}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="text-right">
        <Link
          href="/auth/forgot-password"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          className="w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-[15px] font-medium text-white shadow-xl hover:bg-blue-700 focus:outline-none"
        >
          Sign in
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent dark:border-primary dark:border-t-transparent" />
          )}
        </button>
      </div>
    </form>
  );
}
