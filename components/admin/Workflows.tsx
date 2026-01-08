import { fetchWorkflows } from "@/services/workflowService";
import { useState, useEffect, FC, useContext } from "react";
import AddWorkflow from "../Modals/Workflows/AddEditWorkflow";
import RemoveWorkflow from "../Modals/Workflows/RemoveWorkflow";
import InfoWorkflow from "../Modals/Workflows/InfoWorkflow";
import { IconTrash, IconEdit, IconEye, IconSearch } from '@tabler/icons-react';
import { AuthContext } from '@/utils/app/azureAD';

interface Workflow {
  category: string;
  _id: string;
  title: string;
  description: string;
  hitCount: number;
  subcategory: string;
  subsubcategory: string;
  uploadDescription: string;
}

const Workflows: FC = () => {
  const [workflowsData, setWorkflowsData] = useState<Workflow[]>([]);
  const [filteredWorkflowsData, setFilteredWorkflowsData] = useState<Workflow[]>([]);
  const rowsLimit = 15;
  const [rowsToShow, setRowsToShow] = useState<Workflow[]>([]);
  const [totalPage, setTotalPage] = useState<any>(Math.ceil(workflowsData.length / rowsLimit));
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<string>("add");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const authContext = useContext(AuthContext)
  const user: any = authContext?.user;
  const updateSearchQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(0); // Reset pagination to first page when search query changes

    if (value) {
      const filteredWorkflows = workflowsData.filter(workflow =>
        (workflow._id && workflow._id.toLowerCase().includes(value.toLowerCase())) ||
        (workflow.title && workflow.title.toLowerCase().includes(value.toLowerCase())) ||
        (workflow.description && workflow.description.toLowerCase().includes(value.toLowerCase())) ||
        (workflow.subcategory && workflow.subcategory.toLowerCase().includes(value.toLowerCase())) ||
        (workflow.subsubcategory && workflow.subsubcategory.toLowerCase().includes(value.toLowerCase())) ||
        (workflow.category && workflow.category.toLowerCase().includes(value.toLowerCase()))
      );
      setRowsToShow(filteredWorkflows.slice(0, rowsLimit));
      setFilteredWorkflowsData(filteredWorkflows)
      // Update totalPage based on filtered results
      const newTotalPage = Math.ceil(filteredWorkflows.length / rowsLimit);
      if (newTotalPage !== totalPage) {
        setTotalPage(newTotalPage); // Update the totalPage state if different
      }
    } else {
      setRowsToShow(workflowsData.slice(0, rowsLimit));
      // Reset totalPage to the initial full list divided by rowsLimit
      const newTotalPage = Math.ceil(workflowsData.length / rowsLimit);
      if (newTotalPage !== totalPage) {
        setTotalPage(newTotalPage); // Update the totalPage state if different
      }
    }
  };


  const [Initial, setInitialData] = useState<any>({
    title: '',
    subcategory: '',
    subsubcategory: '',
    category: '',
    prompt: '',
    description: '',
    uploadRequired: false,
    uploadDescription: '',
  });

  const [id, setId] = useState<string>();
  const [prompts, setPrompts] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [uploadDescription, setUploadDescription] = useState<string>();

  const updateRowsToShow = (startIndex: number) => {
    const endIndex = startIndex + rowsLimit;
    setRowsToShow(filteredWorkflowsData.slice(startIndex, endIndex));
  };

  const changePage = (pageIndex: number) => {
    console.log(pageIndex,'page')
    setCurrentPage(pageIndex);
    updateRowsToShow(pageIndex * rowsLimit);
  };

  const previousPage = () => {
    if (currentPage > 0) {
      changePage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPage - 1) {
      changePage(currentPage + 1);
    }
  };

  const getWorkflows = async () => {
    const idToken = user?.idToken || '';
    const params: any = {
      workflowType: 'workflow', // specify the limit here
    };
    const response = await fetchWorkflows(idToken, authContext?.validateAndRefreshToken, params);
    const filteredWorkflows = response.workflows.filter((workflow: Workflow) => {
      // Exclude workflows where both subcategory and subsubcategory are empty
      if (!workflow.subcategory && !workflow.subsubcategory) return false;

      // Exclude workflows in 'Service Lines' or 'Enabling Functions' where subcategory or subsubcategory is empty
      if (
        (workflow.category === 'Service Lines' || workflow.category === 'Enabling Functions') &&
        (!workflow.subcategory || !workflow.subsubcategory)
      ) return false;

      // Exclude workflows in 'General Use Cases' where subcategory is empty
      if (workflow.category === 'General Use Cases' && !workflow.subcategory) return false;

      return true;
    });

    setWorkflowsData(filteredWorkflows);
    setFilteredWorkflowsData(filteredWorkflows)
    setTotalPage(Math.ceil(filteredWorkflows.length / rowsLimit))
    setRowsToShow(filteredWorkflows.slice(0, rowsLimit));
    return response;
  };

  useEffect(() => {
    getWorkflows();
  }, []);

  const renderPagination = () => {
    const pages = [];
    const pageLimit = 5;

    if (totalPage <= pageLimit) {
      for (let i = 0; i < totalPage; i++) {
        pages.push(
          <li
            key={i}
            className={`flex items-center justify-center w-[36px] rounded-[6px] h-[34px] border-[1px] border-solid ${currentPage === i ? "text-white bg-[#729C3E]" : "border-[#E4E4EB]"} cursor-pointer`}
            onClick={() => changePage(i)}
          >
            {i + 1}
          </li>
        );
      }
    } else {
      pages.push(
        <li
          key={0}
          className={`flex items-center justify-center w-[36px] rounded-[6px] h-[34px] border-[1px] border-solid ${currentPage === 0 ? "text-white bg-[#729C3E]" : "border-[#E4E4EB]"} cursor-pointer`}
          onClick={() => changePage(0)}
        >
          1
        </li>
      );

      if (currentPage > 2) {
        pages.push(<li key="left-dots">...</li>);
      }

      const startPage = Math.max(1, currentPage - 1);
      const endPage = Math.min(totalPage - 2, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <li
            key={i}
            className={`flex items-center justify-center w-[36px] rounded-[6px] h-[34px] border-[1px] border-solid ${currentPage === i ? "text-white bg-[#729C3E]" : "border-[#E4E4EB]"} cursor-pointer`}
            onClick={() => changePage(i)}
          >
            {i + 1}
          </li>
        );
      }

      if (currentPage < totalPage - 3) {
        pages.push(<li key="right-dots">...</li>);
      }

      pages.push(
        <li
          key={totalPage - 1}
          className={`flex items-center justify-center w-[36px] rounded-[6px] h-[34px] border-[1px] border-solid ${currentPage === totalPage - 1 ? "text-white bg-[#729C3E]" : "border-[#E4E4EB]"} cursor-pointer`}
          onClick={() => changePage(totalPage - 1)}
        >
          {totalPage}
        </li>
      );
    }

    return pages;
  };

  return (
    <div className="min-h-screen h-full p-10 pr-4 pb-14 bg-[#fff] flex items-top justify-center">
      {isAddModalOpen && <AddWorkflow workflowsData={workflowsData} mode={mode} formData={Initial} update={() => getWorkflows()} setModalOpen={() => setIsAddModalOpen(false)} />}
      {isRemoveModalOpen && <RemoveWorkflow id={id} update={() => getWorkflows()} setModalOpen={() => setIsRemoveModalOpen(false)} />}
      {isInfoModalOpen && <InfoWorkflow id={id} mode={mode} setModalOpen={() => setIsInfoModalOpen(false)} user={user} />}

      <div className="w-full max-full px-2">
        <div className="text-right">
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setMode("add");
              setInitialData({
                title: '',
                subcategory: '',
                subsubcategory: '',
                category: '',
                prompt: '',
                description: '',
                uploadRequired: false,
                uploadDescription: ''
              });
            }}
            className="bg-[#729C3E] hover:bg-[#729C3E] text-white font-bold py-2 px-4 rounded"
          >
            Add Agents
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
        </div>
        <div className="w-full overflow-x-scroll md:overflow-auto max-w-7xl 2xl:max-w-none mt-2">
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={updateSearchQuery}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
              />
              <IconSearch size={"20"} className="absolute top-[12px] left-3" />
            </div>
          </div>
          <table className="table-auto overflow-scroll md:overflow-auto w-full text-left font-inter border">
            <thead className="rounded-lg text-sm text-white font-semibold w-full">
              <tr className="bg-[#fff]/[6%]">
                {[/*"ID",*/ "Name", "Hit Count", "Type", "Category", "Sub Category", "Actions"].map((header) => (
                  <th key={header} className="py-3 px-3 text-[#212B36] sm:text-sm font-bold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsToShow.map((data: any, index: any) => (
                <tr className={`${index % 2 === 0 ? "bg-white" : "bg-[#222E3A]/[6%]"}`} key={data._id}>
                  {/*<td className="py-2 px-3 font-normal text-base border-t break-words max-w-[220px]">{data._id}</td>*/}
                  <td className="py-2 px-3 font-normal text-base border-t break-words max-w-[220px]">{data.title}</td>
                  <td className="py-2 px-3 font-normal text-base border-t break-words max-w-[220px]">{data.hitCount}</td>
                  <td className="py-2 px-3 font-normal text-base border-t break-words max-w-[220px]">{data.category}</td>
                  <td className="py-2 px-3 font-normal text-base border-t break-words max-w-[220px]">{data.subcategory}</td>
                  <td className={`py-2 px-3 font-normal text-base border-t break-words max-w-[220px] ${data.category === 'General Use Cases' ? 'bg-gray-200' : ''}`}>
                    {data.subsubcategory || 'N/A'}
                  </td>
                  <td className="py-2 px-3 font-normal text-base border-t break-words max-w-[220px]">
                    <div className="flex items-center gap-2">
                      <IconEdit className="cursor-pointer" onClick={() => {
                        setIsAddModalOpen(true);
                        setMode("edit");
                        setInitialData(data);
                      }} />
                      <IconEye className="cursor-pointer" onClick={() => {
                        setIsInfoModalOpen(true);
                        setId(data._id);

                      }} />
                      <IconTrash className="cursor-pointer" onClick={() => {
                        setIsRemoveModalOpen(true);
                        setId(data._id);
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full flex justify-center sm:justify-between flex-col sm:flex-row gap-5 mt-1.5 px-1 items-center">
          <div className="text-lg">
            {filteredWorkflowsData.length != 0 ?
              <>
                Showing {currentPage === 0 ? 1 : currentPage * rowsLimit + 1} to{" "}
                {currentPage === totalPage - 1 ? filteredWorkflowsData.length : (currentPage + 1) * rowsLimit} of{" "}
                {filteredWorkflowsData.length} entries
              </> : <>Showing 0 entries</>}
          </div>
          <div className="flex">
            <ul style={{listStyleType: 'none', margin: 0, padding: 0}} className="flex justify-center items-center gap-x-[10px] z-30" role="navigation" aria-label="Pagination">
              <li
                className={`prev-btn flex items-center justify-center w-[36px] rounded-[6px] h-[36px] border-[1px] border-solid border-[#E4E4EB] ${currentPage === 0 ? "bg-[#ededed] pointer-events-none" : "cursor-pointer"}`}
                onClick={previousPage}
              >
                <img src="https://www.tailwindtap.com/assets/travelagency-admin/leftarrow.svg" alt="Previous" />
              </li>
              {renderPagination()}
              <li
                className={`flex items-center justify-center w-[36px] rounded-[6px] h-[36px] border-[1px] border-solid border-[#E4E4EB] ${currentPage === totalPage - 1 ? "bg-[#ededed] pointer-events-none" : "cursor-pointer"}`}
                onClick={nextPage}
              >
                <img src="https://www.tailwindtap.com/assets/travelagency-admin/rightarrow.svg" alt="Next" />
              </li>
            </ul>
          </div>
          <div className='lg:text-[10px] z-50 bg-white  fixed text-[9px]   md:ml-[256px] p-2  lg:px-14  left-11 right-0 bottom-0 text-gray-600 text-center flex justify-between' >
                <div className='pr-4'>Version 3.0 Tax Genie developed by Deloitte Middle East Tax & Legal services in conjiction with the Deloitte Middle East AI Institute</div>
                <div
                  onClick={() => window.open('/assets/Tax_Genie_2.0_Rules_of_the_Road.pdf', '_blank')}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Rules of the Road | Tax Genies intranet site
                  </div>
                </div>
        </div>
      </div>
    </div>
  );
};

export default Workflows;
