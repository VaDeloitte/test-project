"use client";
import { useState, useEffect } from "react";
import Header from "@/components/HomeHeader/HomeHeaderNew";
import Sidebar from "@/components/Folder/NewComp/SideBar";
import LeadershipDashboard from "./backendDemo";


const loadData = async (kql: string) => {
  try {
    const response = await fetch(`/api/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    //   body: JSON.stringify({
    //             query: kql
    //         })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.data; // Array of data
    } else {
      console.error(result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};


export default function LeadershipDashboardLayout() {

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 py-6">
        <LeadershipDashboard/>
      </main>
    </div>
  );
}
