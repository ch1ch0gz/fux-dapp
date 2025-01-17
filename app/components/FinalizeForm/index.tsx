import { useRouter } from "next/router";
import { Workstream, WorkstreamContributor } from "../../.graphclient";
import { useBlockTx } from "../../hooks/useBlockTx";
import { useCustomToasts } from "../../hooks/useCustomToasts";
import {
  contractAddresses,
  contractABI,
  useConstants,
} from "../../utils/constants";
import { calculateRelative, parseEvaluations } from "../../utils/helpers";
import { CloseButton } from "../CloseButton";
import User from "../User";
import { StarIcon } from "@chakra-ui/icons";
import {
  Button,
  Grid,
  GridItem,
  Text,
  Stat,
  StatNumber,
  Flex,
  ButtonGroup,
} from "@chakra-ui/react";
import { BigNumber, ethers } from "ethers";
import _ from "lodash";
import React, { Fragment } from "react";
import { useAccount, useContractWrite, usePrepareContractWrite } from "wagmi";

const FinalizeForm: React.FC<{
  workstream: Partial<WorkstreamContributor>;
}> = ({ workstream }) => {
  const router = useRouter();
  const toast = useCustomToasts();
  const { address } = useAccount();
  const { checkChain } = useBlockTx();
  const { nativeToken } = useConstants();

  const _workstream = workstream as Workstream;

  const averages = parseEvaluations(_workstream);
  const relative = calculateRelative(averages);

  const { config } = usePrepareContractWrite({
    address: contractAddresses.fuxContractAddress,
    abi: contractABI.fux,
    functionName: "finalizeWorkstream",
    args: [
      workstream.id,
      Object.keys(relative || {}) as `0x${string}`[],
      Object.values(relative || {}),
    ],
  });

  const { data, isLoading, isSuccess, write } = useContractWrite({
    ...config,
    onError(e) {
      toast.error(e);
    },
    onSuccess(data) {
      toast.success(
        "Finalizing workstream",
        "Returning FUX and paying out rewards"
      );
      console.log(data);
    },
    onSettled() {
      router.push("/workstreams");
    },
  });

  const _contributors = Object.keys(relative);
  const _ratings = Object.values(relative);
  const total = _.sum(Object.values(relative));

  const onSubmit = () => {
    if (total != 100) {
      toast.warning(`Not enough FUX`, `${total || "..."}/100`);
      return;
    }

    if (_contributors.length !== _ratings.length) {
      toast.warning(
        `Contributor <> Evaluation mismatch`,
        `Did you evaluate everybody?`
      );
      return;
    }

    if (_contributors.length === 0) {
      toast.warning(`Contributor is empty`, `Are contributors committed?`);
      return;
    }

    if (_ratings.length === 0) {
      toast.warning(`Evaluation is empty`, `Are contributors evaluated?`);
      return;
    }

    if (checkChain()) {
      write?.();
    }
  };

  const contributors = _workstream.contributors;
  const coordinator = _workstream.coordinator?.id;

  const finalizeForm =
    contributors && contributors?.length > 0 ? (
      <>
        <Grid gap={2} templateColumns="repeat(16, 1fr)">
          <GridItem colSpan={8}>
            <Text>Contributor</Text>
          </GridItem>
          <GridItem colSpan={3}>
            <Text>Committed</Text>
          </GridItem>
          <GridItem colSpan={2}>
            <Text>vFUX</Text>
          </GridItem>
          <GridItem colSpan={3}>
            <Text>Funds</Text>
          </GridItem>
          {contributors.map((contributor, index) => {
            const address = contributor.contributor.id as `0x${string}`;
            return (
              <Fragment key={index}>
                <GridItem colSpan={8}>
                  <Flex align={"center"}>
                    <User
                      address={address as `0x${string}`}
                      direction="horizontal"
                      displayAvatar={true}
                    />
                    {coordinator?.toLowerCase() === address.toLowerCase() ? (
                      <StarIcon ml={"1em"} color={"yellow"} />
                    ) : undefined}
                  </Flex>
                </GridItem>
                <GridItem colSpan={3}>
                  <Stat>
                    <StatNumber>{`${contributor.commitment || 0}%`}</StatNumber>
                  </Stat>
                </GridItem>
                <GridItem colSpan={2}>
                  <Stat>
                    <StatNumber>
                      {relative[address]?.toString() ?? "0"}
                    </StatNumber>
                  </Stat>
                </GridItem>
                <GridItem
                  bg="#301A3A"
                  display={"inline-grid"}
                  colSpan={3}
                  justifyContent="end"
                  alignContent="center"
                >
                  {_workstream?.funding && _workstream.funding.length > 0 ? (
                    <Text fontFamily="mono" pr={"1em"}>
                      {`${
                        relative[address]
                          ? ethers.utils.formatUnits(
                              BigNumber.from(_workstream.funding[0].amount).mul(
                                BigNumber.from(relative[address]).div(100)
                              ),
                              _workstream.funding[0].token.decimals
                            )
                          : "0"
                      } ${
                        _workstream.funding[0].token.symbol?.toLowerCase() ===
                        "native"
                          ? nativeToken.symbol
                          : _workstream.funding[0].token.symbol
                      }`}
                    </Text>
                  ) : undefined}
                </GridItem>
              </Fragment>
            );
          })}
        </Grid>

        <ButtonGroup>
          {" "}
          <Button
            isDisabled={total != 100}
            isLoading={isLoading}
            type="submit"
            onClick={onSubmit}
          >
            Finalize workstream
          </Button>
          <CloseButton
            workstreamId={workstream.id || ""}
            contributors={contributors.map((c) => c.contributor.id)}
            disabled={coordinator?.toLowerCase() !== address?.toLowerCase()}
          />
        </ButtonGroup>
      </>
    ) : (
      <Text>No contributors found</Text>
    );

  return finalizeForm;
};

export { FinalizeForm };
