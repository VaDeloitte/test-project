'use client';

import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/utils/app/azureAD';
import "@/styles/leadership_dashboard.css";

interface Employee {
  rank: number;
  name: string;
  email: string;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'No Tier';
  score: number;
  dept?: string;
  isCurrentUser?: boolean;
  displayRank?: number;
}

interface Department {
  rank: number;
  score: number;
  platinum: number;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  trend: number;
  adoption: number;
}

interface Country {
  rank: number;
  score: number;
  platinum: number;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  trend: number;
  adoption: number;
}

type TabType = 'employees' | 'departments' | 'regional';



export default function LeadershipDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [tierFilter, setTierFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [employeeData, setEmployeeData] = useState<Employee[] >([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  const [departmentData, setDepartmentData] = useState<Record<string, Department>>({});
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const [countryData, setCountryData] = useState<Record<string, Country>>({});
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<any>(null);
  const [modalData, setModalData] = useState({ title: '', value: '', details: '' });
  const [dashboardData, setDashboardData] = useState<any>(null);
  const authContext = useContext(AuthContext);

    useEffect(() => {
      const fetchData = async () => {
          try {
          const result_data = await loadDashboardData();

          if (result_data) {
              const employees = result_data.employeeData;
              const Department = result_data.departmentData;
              const region = result_data.countryData;

              if (employees) {
                setFilteredEmployees(employees);
                setEmployeeData(employees);
              }
              if (Department) {
                setDepartmentData(Department);
              }
              if (region) {
                setCountryData(region);
              }
          }
          } catch (error) {
          console.error('Error loading data:', error);
          }
      };

    fetchData();
    }, []);

    useEffect(() => {
      const userMetrics = employeeData.filter((emp) => emp.email == authContext?.user?.email)
      setCurrentUser(userMetrics[0])
    }, [employeeData]);


  useEffect(() => {
    // Add event listener for ESC key to close the modal
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    if (modalOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    // Cleanup the event listener when the modal is closed
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [modalOpen]);

useEffect(() => {
  if (employeeData != null) {
    // Apply tier and department filters
    const filtered = employeeData.filter(employee => {
      const matchesTier = !tierFilter || employee.tier === tierFilter;
      const matchesDept = !deptFilter || employee.dept === deptFilter;
      return matchesTier && matchesDept;
    });

    const TOP_COUNT = 20;
    let finalEmployees = filtered.slice(0, TOP_COUNT); // Get top 20 from filtered results

    // Check if current user exists and is not in top 20
    if (currentUser && currentUser.email) {
      const currentUserInTop20 = finalEmployees.some(
        emp => emp.email === currentUser.email
      );
      
      if (!currentUserInTop20) {
        // Find current user in the filtered list
        const currentUserData = filtered.find(
          emp => emp.email === currentUser.email
        );
        
        if (currentUserData) {
          // Add current user at the end with their original rank
          finalEmployees.push({
            ...currentUserData,
            displayRank: currentUserData.rank
          });
        }
      }
    }

    // Mark the current user for styling
    finalEmployees = finalEmployees.map(employee => ({
      ...employee,
      isCurrentUser: !!(currentUser?.email && employee.email === currentUser.email)
    }));

    setFilteredEmployees(finalEmployees);
  }
}, [tierFilter, deptFilter, employeeData, currentUser]);

  const openModal = (title: string, value: string, details: string) => {
    setModalData({ title, value, details });
    setModalOpen(true);
  };

  const getTierClass = (tier: string) => {
    const tierMap: Record<string, string> = {
      'Platinum': 'tier-platinum',
      'Gold': 'tier-gold',
      'Silver': 'tier-silver',
      'Bronze': 'tier-bronze'
    };
    return tierMap[tier] || '';
  };

  const selectDepartment = (deptName: string) => {
    setSelectedDept(deptName);
  };

  const selectAllDepartments = () => {
    setSelectedDept(null);
  };

  const selectCountry = (countryName: string) => {
    setSelectedCountry(countryName);
  };

  const selectAllCountries = () => {
    setSelectedCountry(null);
  };

  const getDeptStats = () => {
    if (!selectedDept) {
      const totalEmployees = Object.values(departmentData).reduce((sum, dept) => sum + dept.total, 0);
      const totalPlatinum = Object.values(departmentData).reduce((sum, dept) => sum + dept.platinum, 0);
      const avgScore = (Object.values(departmentData).reduce((sum, dept) => sum + dept.score, 0) / Object.keys(departmentData).length).toFixed(1);
      const avgTrend = + ((Object.values(departmentData).reduce((sum, dept) => sum + dept.trend, 0) / Object.keys(departmentData).length).toFixed(1));
      return { name: 'All Departments', totalEmployees, totalPlatinum, avgScore, avgTrend, trend: 'Combined Overview' };
    }
    const dept = departmentData[selectedDept];
    return {
      name: selectedDept,
      totalEmployees: dept.total,
      totalPlatinum: dept.platinum,
      avgScore: dept.score.toFixed(1),
      avgTrend: + dept.trend.toFixed(1),
      trend: `Rank #${dept.rank} - Score: ${dept.score}`
    };
  };

  const getCountryStats = () => {
    if (!selectedCountry) {
      const totalProfessionals = Object.values(countryData).reduce((sum, country) => sum + country.total, 0);
      const totalPlatinum = Object.values(countryData).reduce((sum, country) => sum + country.platinum, 0);
      const avgScore = (Object.values(countryData).reduce((sum, country) => sum + country.score, 0) / Object.keys(countryData).length).toFixed(1);
      const avgAdoption = (Object.values(countryData).reduce((sum, country) => sum + country.adoption, 0) / Object.keys(countryData).length).toFixed(1);
      return { name: 'All Countries', totalProfessionals, totalPlatinum, avgScore, avgAdoption, trend: 'Combined Overview' };
    }
    const country = countryData[selectedCountry];
    return {
      name: selectedCountry,
      totalProfessionals: country.total,
      totalPlatinum: country.platinum,
      avgScore: country.score.toFixed(1),
      avgAdoption: country.adoption.toFixed(1),
      trend: `Rank #${country.rank} - Score: ${country.score}`
    };
  };

  const deptStats = getDeptStats();
  const countryStats = getCountryStats();

  return (
   <div className="h-[88vh] mb-6 overflow- scrollbar-none bg-gray-50 dark:bg-[#121212] font-sans  md:mt-[10px]">
  {/* Header */}
  <header className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-700 shadow-sm">
    <div className="max-w-7xl  px-6 py-5">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🏆 Tax Genie Performance Dashboard </h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">  Performance rankings and tier analysis across ME region</p>
    </div>
  </header>

     {/* Main Container */}
<div className="w-full px-6 py-8 bg-[#f2f6f7] dark:bg-[#121212]">
  {/* Tab Navigation */}
  <div className="flex bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm mb-8 overflow-hidden">
    <button
      onClick={() => setActiveTab('employees')}
      className={`flex-1 px-6 py-4 font-medium transition-all border-r border-gray-200 dark:border-gray-700 ${
        activeTab === 'employees'   ? 'bg-[#43B02A] text-white font-semibold'    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
      }`}
    >
      Tax Employees
    </button>
    <button
      onClick={() => setActiveTab('departments')}
      className={`flex-1 px-6 py-4 font-medium transition-all border-r border-gray-200 dark:border-gray-700 ${
        activeTab === 'departments'  ? 'bg-[#43B02A] text-white font-semibold'  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
      }`}
    >
      Departments
    </button>
    <button
      onClick={() => setActiveTab('regional')}
      className={`flex-1 px-6 py-4 font-medium transition-all ${
        activeTab === 'regional'   ? 'bg-[#43B02A] text-white font-semibold'  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
      }`}
    >
      ME Regional
    </button>
  </div>

  {/* Employees Tab */}
  {activeTab === 'employees' && (
    <div className="animate-fadeIn">
      {/* Stats Cards */}
      {currentUser ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div
          onClick={() => openModal( 'Your Current Rank',  `${currentUser.rank}th`,  "Keep up the good work, you are doing great." )  }
          className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{currentUser.rank}th</div>
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Your Rank</div>
          {/* <div className="text-green-600 text-xs mt-1 font-medium">▲ 2 positions vs last month</div> */}
        </div>
        <div
          onClick={() => openModal('Your Performance Tier', `${currentUser.tier}`, `Solid performance in ${currentUser.tier} tier — Keep up the good work!`) }
          className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2"><span className={`inline-flex items-center px-3 py-1 rounded-full uppercase tracking-wide ${getTierClass(currentUser.tier)}`}>{currentUser.tier}</span> </div>
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Your Tier</div>
          <div className="text-gray-900 dark:text-gray-400 text-xs mt-1 font-medium">  Current Performance Level </div>
        </div>
        <div
          onClick={() =>openModal('Your Performance Score',`${currentUser.score} `,"--") }
          className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{currentUser.score} </div>
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Your Performance Score</div>
          <div className="text-green-600 text-xs mt-1 font-medium">Overall Rating</div>
          <div className="mt-2">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-pink-600 via-orange-500 to-green-500 rounded-full"style={{ width: '76.4%' }}></div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div
          className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">NaN</div>
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Your Rank</div>
        </div>
        <div
          className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">NaN</div>
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Your Tier</div>
        </div>
        <div
          className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">NaN</div>
          <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Your Performance Score</div>
        </div>
      </div>
      )}


      {/* Employee Rankings Table */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {(tierFilter === "" && deptFilter ==="" ) ? 'Top 20 Employee Rankings' : `Employee Rankings (showing ${filteredEmployees.length})`}
          </h3>
          <div className="flex gap-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-[#2E2E2E] dark:text-gray-100"
            >
              <option value="">All Tiers</option>
              <option value="Platinum">Platinum</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
            </select>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-[#2E2E2E] dark:text-gray-100"
            >
              <option value="">All Departments</option>
              {Object.keys(departmentData).map(  key => (
                <option value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full [&_tr:last-child_td]:border-b-0">
            <thead>
              <tr className="dark:bg-gray-700">
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  Rank
                </th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  Employee Name
                </th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  Email
                </th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  Tier
                </th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  Overall Score
                </th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  Department
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {

                return (
                <tr
                  key={employee.rank}
                  className={`${employee.isCurrentUser  ? 'bg-[#DCE5E9] dark:bg-gray-700 border-l-4 border-l-gray-700 dark:border-l-gray-500' : 'transition-colors hover:bg-gray-50 dark:hover:bg-[#2E2E2E]' }`}
                >
                  <td className="text-center font-bold dark:text-gray-100 dark:border-gray-600"> {employee.displayRank || employee.rank}</td>
                  <td className="dark:text-gray-100  dark:border-gray-600"> {employee.name}</td>
                  <td className="text-gray-500 dark:text-gray-400 text-xs dark:border-gray-600"> {employee.email}</td>
                  <td className="dark:border-gray-600">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getTierClass( employee.tier )}`}>
                      {employee.tier}
                    </span>
                  </td>
                  <td className="dark:text-gray-100 text-center dark:border-gray-600">{employee.score.toFixed(2)} </td>
                  <td className="dark:text-gray-300 dark:border-gray-600">{employee.dept}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}


        {/* Departments Tab */}
{activeTab === 'departments' && (
  <div className="animate-fadeIn">
    {/* Department Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
      <div
        onClick={() =>openModal(deptStats.name + ' Analysis',deptStats.name,  `Total Employees: ${deptStats.totalEmployees} | Average Score: ${deptStats.avgScore} | Total Platinum: ${deptStats.totalPlatinum}`) }
        className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{deptStats.name}</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Selected Department</div>
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">{deptStats.trend}</div>
      </div>
      <div
        onClick={() => {
          const topName = Object.keys(departmentData).find(  key => departmentData[key].rank === 1) || "";
          const topDepData = Object.values(departmentData).find( d => d.rank === 1);
          const platPercent = (((topDepData?.platinum || 0) / (topDepData?.total || 1)) * 100).toFixed(1)
          openModal(
            'Top Performing Department',
            topName,
            `${topName} tops the chart with an ${topDepData?.score} average score, ${topDepData?.platinum} Platinum employees (${platPercent}%), and ${topDepData?.trend}% growth since last quarter.`
          )
        }}
        className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{Object.keys(departmentData).find(  key => departmentData[key].rank === 1)}</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Top Department</div>
        <div className="text-green-600 text-xs mt-1 font-medium">{Object.values(departmentData).find( d => d.rank === 1)?.score} avg score</div>
      </div>
      <div
        onClick={() =>
          openModal(
            'Platinum Tier Employees',
            deptStats.totalPlatinum.toString(),
            `${deptStats.totalPlatinum} employees have achieved Platinum (Top 10%), representing ${(
              (deptStats.totalPlatinum / deptStats.totalEmployees) *
              100  ).toFixed(1)}% of total Tax & Legal professionals.`)}
        className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{deptStats.totalPlatinum}</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Platinum Employees</div>
        <div className="text-green-600 text-xs mt-1 font-medium">
          {((deptStats.totalPlatinum / deptStats.totalEmployees) * 100).toFixed(1)}% of {deptStats.totalEmployees} total employees
        </div>
      </div>
      <div
        onClick={() =>openModal(  'Performance Trend Analysis', `${deptStats.avgTrend >= 0 ? '▲ +' : '▼' + deptStats.avgTrend}%`,  `Overall performance up by ${deptStats.avgTrend}% vs last quarter. Key drivers: client satisfaction, technical competency, and delivery excellence.` )}
        className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div
          className={`text-xl font-bold mb-2 ${
            deptStats.avgTrend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {deptStats.avgTrend >= 0 ? '▲ +' : '▼'}{deptStats.avgTrend}%
        </div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Performance Trend</div>
        <div className="text-green-600 text-xs mt-1 font-medium">Average Trend</div>
      </div>
    </div>

    {/* Department Rankings Table */}
    <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Department Performance Rankings</h3>
        <button
          onClick={selectAllDepartments}
          className="px-4 py-2 bg-gray-800 dark:bg-[#2E2E2E] text-white rounded-md font-semibold hover:bg-gray-950 dark:hover:bg-[#43B02A] transition-colors"
        >
          Select All Departments
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="dark:bg-gray-700">
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Rank
              </th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Department
              </th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Weighted Avg Score
              </th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Performance Trend
              </th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Adoption Level
              </th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Tier Distribution
              </th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:bg-[#2E2E2E] dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                Total Employees
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(departmentData).map(([deptName, dept]) => (
              <tr
                key={deptName}
                onClick={() => selectDepartment(deptName)}
                className={`cursor-pointer ${
                  selectedDept === deptName
                    ? 'bg-green-50 dark:bg-green-900 border-l-4 border-l-green-500 dark:border-l-green-400'
                    : 'hover:bg-gray-50  dark:hover:bg-[#2E2E2E] transition-all'
                }`}
              >
                <td className="text-center dark:text-gray-100 dark:border-gray-600">{dept.rank} </td>
                <td className="dark:text-gray-100 dark:border-gray-600"> {deptName === 'M&A'
                    ? 'Mergers & Acquisitions (M&A)'  : deptName === 'GTA'
                    ? 'Global Trade Advisory (GTA)': deptName === 'VAT'
                    ? 'Value Added Tax (VAT)' : deptName === 'ITS'
                    ? 'International Tax Services (ITS)' : deptName === 'GES'
                    ? 'Global Employer Services (GES)' : deptName === 'BT'
                    ? 'Business Tax (BT)'  : deptName === 'TP'
                    ? 'Transfer Pricing (TP)': deptName === 'TTC'
                    ? 'Tax Technology Consulting (TTC)': deptName === 'BPS'
                    ? 'Business Process Solutions (BPS)' : 
                    deptName}
                     </td>
                <td className="dark:text-gray-100 dark:border-gray-600">{dept.score}</td>
                <td
                  className={
                    dept.trend >= 0
                      ? "text-green-600 dark:border-gray-700"
                      : "text-red-600 dark:border-gray-700"
                  }
                >
                  {dept.trend >= 0 ? "▲" : "▼"} {dept.trend}%
                </td>
                <td className=" dark:text-gray-100 dark:border-gray-600">
                  {dept.adoption}%
                </td>
                <td className="dark:border-gray-600">
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-platinum">{dept.platinum} </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-gold"> {dept.gold}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-silver">  {dept.silver} </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-bronze">  {dept.bronze}</span>
                  </div>
                </td>
                <td className="dark:text-gray-100 dark:border-gray-600"> {dept.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

    {/* Regional Tab */}
{activeTab === 'regional' && (
  <div className="animate-fadeIn">
    {/* Regional Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
      <div
        onClick={() =>  openModal( countryStats.name + ' Analysis', countryStats.name, `Total Professionals: ${countryStats.totalProfessionals} | Average Score: ${countryStats.avgScore} | Total Platinum: ${countryStats.totalPlatinum}`   )
        }
        className="bg-white dark:bg-[#1E1E1E] dark:text-white rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">{countryStats.name}</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Selected Country</div>
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">{countryStats.trend}</div>
      </div>
      <div
        onClick={() =>{
          const topName = Object.keys(countryData).find(  key => countryData[key].rank === 1) || "";
          const topConData = Object.values(countryData).find( d => d.rank === 1);
          const platPercent = (((topConData?.platinum || 0) / (topConData?.total || 1)) * 100).toFixed(1)
          openModal( 'Leading Member Firm',  topName,   `${topName} leads the ME region with ${topConData?.score} average score, ${topConData?.total} employees, and ${topConData?.adoption}% adoption level. They have ${topConData?.platinum} Platinum employees.`   )
        }}
        className="bg-white dark:bg-[#1E1E1E] dark:text-white rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">{Object.keys(countryData).find(  key => countryData[key].rank === 1) || ""}</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Leading Country</div>
        <div className="text-green-600 text-xs mt-1 font-medium">{Object.values(countryData).find( d => d.rank === 1)?.score} avg score</div>
      </div>
      <div
        onClick={() => openModal(  'Platinum Tier Professionals',  countryStats.totalPlatinum.toString(), `${countryStats.totalPlatinum} professionals have achieved Platinum status (Top 10%). This represents ${(  (countryStats.totalPlatinum / countryStats.totalProfessionals) *   100 ).toFixed(1)}% of total regional Tax & Legal professionals.`  )
        }
        className="bg-white dark:bg-[#1E1E1E] dark:text-white rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">{countryStats.totalPlatinum}</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Platinum Professionals</div>
        <div className="text-green-600 text-xs mt-1 font-medium">  {((countryStats.totalPlatinum / countryStats.totalProfessionals) * 100).toFixed(1)}% of{' '}  {countryStats.totalProfessionals} total professionals </div>
      </div>
      <div
        onClick={() =>  openModal(  'Regional Adoption Level',  `${countryStats.avgAdoption}%`,   'Regional adoption level improved by 3.2% vs last quarter. Key drivers: Digital transformation initiatives, enhanced training programs, and technology platform upgrades across all countries.'   )
        }
        className="bg-white dark:bg-[#1E1E1E] dark:text-white rounded-lg p-6 shadow-sm text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
      >
        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">{countryStats.avgAdoption}%</div>
        <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">Adoption Level</div>
        <div className="text-green-600 text-xs mt-1 font-medium">Average Adoption</div>
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-600 via-orange-500 to-green-500 rounded-full"
              style={{ width: `${countryStats.avgAdoption}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>

    {/* Regional Rankings Table */}
    <div className="bg-white dark:bg-[#1E1E1E] dark:text-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">ME Member Firm Rankings</h3>
        <button
          onClick={selectAllCountries}
          className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-950 dark:bg-[#2E2E2E] dark:hover:bg-[#43B02A] transition-colors"
        >
          Select All Countries
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="dark:bg-[#1E1E1E]">
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Rank</th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Member Firm</th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Weighted Avg Score</th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Performance Trend</th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Adoption Level</th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Tier Distribution</th>
              <th className="px-3 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:bg-[#2E2E2E] dark:border-gray-700">Total Employees</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(countryData).map(([countryName, country]) => {
                      const flagMap: Record<string, string> = {
                        'United Arab Emirates': 'AE',
                        'Saudi Arabia': 'SA',
                        'Qatar': 'QA',
                        'Kuwait': 'KW',
                        'Bahrain': 'BH',
                        'Oman': 'OM',
                        'Lebanon': 'LB',
                        'Jordan': 'JO',
                        'Egypt': 'EG',
                        'Cyprus': 'CY'
              };
              return (
                <tr
                  key={countryName}
                  onClick={() => selectCountry(countryName)}
                  className={`cursor-pointer ${  selectedCountry === countryName    ? 'bg-green-50 dark:bg-green-900 border-l-4 border-l-green-500'    : 'hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-all' }`}
                >
                  <td className="text-center font-bold dark:text-white dark:border-gray-700">  {country.rank}  </td>
                  <td className="dark:text-white dark:border-gray-700">
                    <span className="mr-2">{flagMap[countryName]}</span>
                    <span>{countryName}</span>
                  </td>
                  <td className="dark:text-gray-200 dark:border-gray-700">
                    {country.score}
                  </td>
                  <td
                    className={
                      country.trend >= 0
                        ? "text-green-600 dark:border-gray-700"
                        : "text-red-600 dark:border-gray-700"
                    }
                  >
                    {country.trend >= 0 ? "▲" : "▼"} {country.trend}%
                  </td>
                  <td className="dark:text-gray-300 dark:border-gray-700">
                    {country.adoption}%
                  </td>
                  <td className="dark:border-gray-700">
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-platinum">
                        {country.platinum}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-gold">
                        {country.gold}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-silver">
                        {country.silver}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-semibold tier-bronze">
                        {country.bronze}
                      </span>
                    </div>
                  </td>
                  <td className="dark:text-white dark:border-gray-700">
                    {country.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
      </div>

{/* Need to fixed the wording for modals */}
{/* Modal */}
{modalOpen && (
  <div
    className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
    onClick={() => setModalOpen(false)}
  >
    <div
      className="bg-white dark:bg-[#1E1E1E] dark:text-white rounded-lg p-8 max-w-lg w-11/12 shadow-2xl animate-slideIn"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{modalData.title}</h3>
        <button
          onClick={() => setModalOpen(false)}
          className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors text-2xl"
        >
          ×
        </button>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold text-black dark:text-white my-4">{modalData.value}</div>
        <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-4 mt-5 text-left text-gray-700 dark:text-gray-300 leading-relaxed">
          {modalData.details}
        </div>
      </div>
    </div>
  </div>
)}

{/* Footer */}
{/* <div className="text-center py-8 text-gray-600 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-700 mt-10">
  Last updated: December 9, 2024 at 1:51 PM | Data refreshed every 24 hours
</div> */}

<style jsx>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-30px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease;
  }

  .animate-slideIn {
    animation: slideIn 0.3s ease;
  }
`}</style>
</div>
  )}



const loadDashboardData = async () => {
  try {
    const response = await fetch(`/api/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result; // Array of data
    } else {
      console.error(result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
};