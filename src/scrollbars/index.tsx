import React, {
  ReactNode,
  Ref
} from 'react';
import {Scrollbars as ScrollbarsExternal} from 'react-custom-scrollbars';
import Measure from 'react-measure'

export interface ScrollbarsProps {
  children? : ReactNode;
  className?:  string;
  calculateHeight?: (bounds) => number;
  scrollContainerRef?: Ref<any>;
  universal?: boolean;
  autoHide?: boolean;
}

export const Scrollbars : React.FC<ScrollbarsProps> = (props) => {
  const {children, className, calculateHeight, scrollContainerRef, ...rest} = props;
  const calculateHeightToUse = calculateHeight ? calculateHeight : (bounds) => bounds.top;
  return <Measure bounds>{
    ({measureRef, contentRect}) => {
      const dynamicHeight = `calc(100vh - ${contentRect.bounds.top ? calculateHeightToUse(contentRect.bounds) : 0}px)`;
      return <div ref={measureRef} className={`scrollbars ${className}`}
                  style={{height: dynamicHeight}}>
        <ScrollbarsExternal {...rest} ref={scrollContainerRef}>{children}</ScrollbarsExternal>
      </div>;
    }
  }</Measure>;
};
