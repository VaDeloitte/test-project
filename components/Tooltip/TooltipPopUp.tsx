import { FC } from 'react';
import { Tooltip } from 'react-tooltip';

interface Props {
  label: string;
  id: string;
  children: any;
  title:string;
  position?:any;
}

const TooltipPopUp = ({ id = '',title="", label = '', children ,position="bottom"}: Props) => {
  return (
    <>
      <div id={id} data-tooltip-id={id}>{children}</div>
      <Tooltip
        anchorSelect={`#${id}`}
        place={position}
        style={{ width: '15rem',zIndex:1000}}
      >
        <h4>{title}</h4>
        <span style={{fontSize:"10px"}}>{label}</span>
      </Tooltip>
    </>
  );
};

export default TooltipPopUp;
