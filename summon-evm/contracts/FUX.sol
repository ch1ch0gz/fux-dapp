// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "hardhat/console.sol";

contract FUX is ERC1155, ERC1155Supply, ERC1155URIStorage, AccessControl {
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant FUX_TOKEN_ID = 0;
    uint256 public constant VFUX_TOKEN_ID = 1;
    uint256 internal counter = 0;

    event FuxClaimed(address user);
    event FuxGiven(address user, uint256 workstreamId, uint256 amount);
    event WorkstreamMinted(uint256 id, string metadataUri);
    event ContributorAdded(uint256 id, address contributor);

    struct Workstream {
        string name;
        address creator;
        address[] contributors;
        uint256 deadline;
        bool exists;
    }

    struct Evaluation {
        address[] contributors;
        uint256[] ratings;
    }

    mapping(uint256 => Workstream) internal workstreams;
    mapping(address => uint256[]) internal contributorWorkstreams;
    mapping(address => mapping(uint256 => uint256)) internal contributorCommitments;
    mapping(address => mapping(uint256 => Evaluation)) internal commitmentEvaluations;
    mapping(address => mapping(uint256 => Evaluation)) internal valueEvaluations;

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function uri(uint256 tokenId) public view override(ERC1155, ERC1155URIStorage) returns (string memory) {
        return super.uri(tokenId);
    }

    function setURI(string memory newuri) public onlyRole(URI_SETTER_ROLE) {
        _setURI(newuri);
    }

    function mintFux() public {
        require(balanceOf(msg.sender, FUX_TOKEN_ID) == 0, "Already got your FUX on");
        _mint(msg.sender, FUX_TOKEN_ID, 100, "");
        emit FuxClaimed(msg.sender);
    }

    function mintWorkstream(
        string memory name,
        address[] calldata contributors,
        uint256 deadline
    ) public {
        console.log("MINTING WORKSTREAM");
        require(contributors.length > 0, "No contributors known");
        uint256 workstreamID = counter;
        Workstream memory _workstream = Workstream(name, msg.sender, contributors, deadline, true);
        workstreams[workstreamID] = _workstream;

        uint256 contributorsLength = contributors.length;
        for (uint256 i = 0; i < contributorsLength; i++) {
            addContributor(workstreamID, contributors[i]);
        }

        emit WorkstreamMinted(workstreamID, "http://example.com");
        counter = counter + 1;
    }

    function addContributor(uint256 workstreamId, address contributor) public {
        require(workstreams[workstreamId].exists, "Workstream does not exists");
        require(workstreams[workstreamId].creator == msg.sender, "msg.sender is not the creator");

        contributorWorkstreams[contributor].push(workstreamId);
        emit ContributorAdded(workstreamId, contributor);
    }

    function getWorkstreamIDs(address user) public view returns (uint256[] memory ids) {
        ids = contributorWorkstreams[user];
    }

    function getWorkstreamByID(uint256 workstreamID) public view returns (Workstream memory workstream) {
        workstream = workstreams[workstreamID];
    }

    function getWorkstreamCommitment(uint256 workstreamID, address user) public view returns (uint256 fuxGiven) {
        fuxGiven = contributorCommitments[user][workstreamID];
    }

    function commitToWorkstream(uint256 workstreamID, uint256 fuxGiven) public {
        require(balanceOf(msg.sender, FUX_TOKEN_ID) >= fuxGiven, "Not enough FUX to give");
        contributorCommitments[msg.sender][workstreamID] = fuxGiven;
        _safeTransferFrom(msg.sender, address(this), FUX_TOKEN_ID, fuxGiven, "");
    }

    function withdrawFromWorkstream(uint256 workstreamID) public {
        uint256 fuxGiven = contributorCommitments[msg.sender][workstreamID];
        require(fuxGiven > 0, "No FUX were given");
        contributorCommitments[msg.sender][workstreamID] = 0;
        _safeTransferFrom(address(this), msg.sender, FUX_TOKEN_ID, fuxGiven, "");
    }

    //TODO checks
    function submitCommitmentEvaluation(
        uint256 workstreamID,
        address[] memory contributors,
        uint256[] memory ratings
    ) public {
        commitmentEvaluations[msg.sender][workstreamID] = Evaluation(contributors, ratings);
    }

    function getCommitmentEvaluation(uint256 workstreamID) public view returns (Evaluation memory evaluation) {
        evaluation = commitmentEvaluations[msg.sender][workstreamID];
    }

    //TODO checks
    function submitValueEvaluation(
        uint256 workstreamID,
        address[] memory contributors,
        uint256[] memory ratings
    ) public {
        valueEvaluations[msg.sender][workstreamID] = Evaluation(contributors, ratings);
    }

    function getValueEvaluation(uint256 workstreamID) public view returns (Evaluation memory evaluation) {
        evaluation = valueEvaluations[msg.sender][workstreamID];
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
