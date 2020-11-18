import React, { useEffect } from "react";
import { Link, Route } from "react-router-dom";
import { observer } from "mobx-react";
import { runInAction } from "mobx";

import Terria from "../../Models/Terria";
import ViewState from "../../ReactViewModels/ViewState";

import Button from "../../Styled/Button.jsx";
import brandMapping from "./brandMapping";

interface BrandRouteProps {
  terria: Terria;
  viewState: ViewState;
  brand: string;
}

function BrandRoute(props: BrandRouteProps) {
  const brand = props.brand;
  useEffect(() => {
    runInAction(() => {
      props.terria.configParameters.brandBarElements = (brandMapping as any)[
        brand
      ]?.branding;
      props.terria.configParameters.theme = (brandMapping as any)[brand]?.theme;
    });
  }, []);
  return <>brand: {brand}</>;
}

interface Props {
  terria: Terria;
  viewState: ViewState;
}

const BrandPrototype = observer(function BrandPrototype(props: Props) {
  const { terria, viewState } = props;
  return (
    <>
      <div
        css={`
          background: white;
        `}
      >
        <Route
          path={"/brand/de-aust"}
          render={() => (
            <BrandRoute brand="de-aust" terria={terria} viewState={viewState} />
          )}
        />
        <Route
          path={"/brand/de-africa"}
          render={() => (
            <BrandRoute
              brand="de-africa"
              terria={terria}
              viewState={viewState}
            />
          )}
        />
      </div>
      <Link to="/brand/de-aust">
        <Button>DE Australia Brand</Button>
      </Link>
      <Link to="/brand/de-africa">
        <Button>DE Africa Brand</Button>
      </Link>
    </>
  );
});

export default BrandPrototype;